interface AppActions {
    status: () => {
        cameraOn: boolean;
        trackingReady: boolean;
        guidesVisible: boolean;
    };
    stop: () => void;
    setGuides: (visible: boolean) => void;
}
interface ModelContext {
    registerTool: (tool: {
        name: string;
        description: string;
        inputSchema: object;
        annotations: {
            readOnlyHint: boolean;
            untrustedContentHint: boolean;
        };
        execute: (input: unknown) => unknown;
    }, options: {
        signal: AbortSignal;
    }) => void | Promise<void>;
}
export function registerAppTools(actions: AppActions) {
    const context = (document as Document & {
        modelContext?: ModelContext;
    }).modelContext;
    if (!context?.registerTool)
        return;
    const lifecycle = new AbortController();
    const tools = [
        { name: 'get_camera_status', description: 'Read camera, tracking and guide status. Does not expose frames or landmarks.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, readOnly: true,
            execute: (_input: unknown) => actions.status() },
        { name: 'stop_camera', description: 'Turn off the camera and release its video stream. Returns to the introduction.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, readOnly: false,
            execute: (_input: unknown) => { actions.stop(); return actions.status(); } },
        { name: 'set_tracking_guides', description: 'Show or hide the visible hand and mouth tracking guides without changing camera access.', inputSchema: { type: 'object', properties: { visible: { type: 'boolean' } }, required: ['visible'], additionalProperties: false }, readOnly: false,
            execute: (input: unknown) => {
                if (!input || typeof input !== 'object' || !('visible' in input) || typeof input.visible !== 'boolean' || Object.keys(input).some(key => key !== 'visible'))
                    throw new Error('Expected only a boolean visible property.');
                actions.setGuides(input.visible);
                return actions.status();
            } },
    ];
    for (const tool of tools) {
        try {
            void Promise.resolve(context.registerTool({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema, annotations: { readOnlyHint: tool.readOnly, untrustedContentHint: false }, execute: tool.execute }, { signal: lifecycle.signal })).catch(() => { });
        }
        catch { /* Optional API: camera controls continue to work without it. */ }
    }
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
