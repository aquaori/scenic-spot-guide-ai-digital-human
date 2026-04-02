export interface Spot {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface RouteRecommendation {
  id: string;
  title: string;
  highlights: string[];
  durationMinutes: number;
}
