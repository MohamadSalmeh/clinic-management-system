export interface OperationCreatedEventPayload {
    userId: number;
    appointmentId: number;
    requestedDate: string;
    startTime: string;
    endTime: string;
    doctorName: string | null;
    clinicName: string | null;
}

export class OperationCreatedEvent {
    static readonly eventName = 'operation.created';

    constructor(public readonly payload: OperationCreatedEventPayload) { }
}