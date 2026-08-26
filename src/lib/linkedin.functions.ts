import { createServerFn } from "@tanstack/react-start";

export interface LinkedInProfile {
  name: string;
  givenName: string;
  picture: string | null;
}

export const getLinkedInProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<LinkedInProfile | null> => {
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const linkedInApiKey = process.env["LINKEDIN_API_KEY"];
    if (!lovableApiKey || !linkedInApiKey) {
      return null;
    }

    const response = await fetch(
      "https://connector-gateway.lovable.dev/linkedin/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": linkedInApiKey,
        },
      },
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(`LinkedIn profile request failed [${response.status}]: ${body}`);
      return null;
    }

    const profile = (await response.json()) as {
      name?: string;
      given_name?: string;
      picture?: string;
    };
    return {
      name: profile.name ?? "LinkedIn User",
      givenName: profile.given_name ?? profile.name ?? "there",
      picture: profile.picture ?? null,
    };
  },
);
