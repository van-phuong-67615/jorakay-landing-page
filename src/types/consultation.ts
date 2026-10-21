import type { z } from "zod";
import type { consultationSchema } from "@/lib/validations/consultation.schema";

export type ConsultationInput = z.input<typeof consultationSchema>;
export type ConsultationData = z.output<typeof consultationSchema>;
