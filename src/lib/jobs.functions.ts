import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aggregateJobs } from "./jobs.server";

export const getJobs = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ keywords: z.array(z.string().min(1)).min(1).max(12) }).parse(data),
  )
  .handler(async ({ data }) => {
    return aggregateJobs(data.keywords);
  });
