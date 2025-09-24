import { type StateMachine } from 'xstate';
export interface SandboxOptions {
    timeout?: number;
    allowedGlobals?: string[];
}
export interface MachineSnapshot {
    value: any;
    context: any;
    history?: any;
}
export declare class NSMStateMachine {
    private readonly DANGEROUS_GLOBALS;
    private readonly UNSAFE_PATTERNS;
    private readonly REQUIRED_FIELDS;
    loadMachine(definition: any): StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
    interpret(machine: StateMachine<any, any, any, any, any, any, any, any, any, any, any, any, any, any>, options?: any, snapshot?: MachineSnapshot): any;
    createSandbox(implementations?: any, options?: SandboxOptions): any;
    serializeState(actor: any): MachineSnapshot;
    private validateMachineStructure;
    private validateMachineSecurity;
    private validateObjectSecurity;
    private wrapInSandbox;
    private isSafeGlobal;
    private validateImplementations;
    private validateFunctionSecurity;
    private createRestrictedContext;
    private executeInRestrictedContext;
    private createWebWorkerSandbox;
    private getMemoryUsage;
    validateNostrEvent(event: any): boolean;
    validateContentHash(content: string, expectedHash: string): boolean;
    private executionCounts;
    private readonly RATE_LIMIT_WINDOW;
    private readonly RATE_LIMIT_MAX_EXECUTIONS;
    private checkRateLimit;
    canExecute(identifier: string): boolean;
    cleanupRateLimit(): void;
}
//# sourceMappingURL=state-machine.d.ts.map