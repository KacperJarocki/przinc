export interface TicketMessage {
  id?: number;
  ticketId: number;
  senderEmail: string;
  senderName: string;
  senderType: 'user' | 'admin'; // user lub admin
  content: string;
  createdDate?: string | Date;
  attachments?: string[];
}

export interface TicketDetails {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdDate: string | Date;
  createdBy: string;
  assignedTo: string;
  group: string | null;
  messages?: TicketMessage[];
}
