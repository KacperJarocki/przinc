export interface TicketGroup {
  id?: number;
  name: string;
  description?: string;
  ticketIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
}
