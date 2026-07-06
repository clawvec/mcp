import type { LessonFields } from '../types.js';
export declare const recordToolDef: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            domain: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            system: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            type: {
                type: string;
                description: string;
            };
            severity: {
                type: string;
                enum: string[];
                description: string;
            };
            problem: {
                type: string;
                description: string;
            };
            fix: {
                type: string;
                description: string;
            };
            key_lesson: {
                type: string;
                description: string;
            };
            prevention: {
                type: string;
                description: string;
            };
            cause: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
        };
        required: string[];
    };
};
export declare function recordLesson(fields: LessonFields & {
    cause?: string[];
}): Promise<string>;
