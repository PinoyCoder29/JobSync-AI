import { z } from "zod";

export const mediaKindSchema = z.enum(["avatar", "cover"]);
