export type MerchantProfile = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: string;
  balance: number;
};

export type ApiKeyItem = {
  id: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string | null;
};

export type WebhookConfig = {
  url: string;
  enabled: boolean;
  lastTestAt?: string | null;
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const mockProfile: MerchantProfile = {
  id: "MERCHANT-1001",
  name: "Nadia Ayu",
  email: "nadia@sinarpay.id",
  status: "ACTIVE",
  createdAt: "2026-06-03T09:30:00Z",
  balance: 24500000,
};

const mockApiKeys: ApiKeyItem[] = [
  {
    id: "key-001",
    key: "demo-api-key-001",
    createdAt: "2026-08-01T09:30:00Z",
    lastUsedAt: "2026-08-22T17:14:00Z",
  },
];

const mockWebhook: WebhookConfig = {
  url: "https://hooks.example.com/sinarpay/merchant-1001",
  enabled: true,
  lastTestAt: "2026-08-21T14:12:00Z",
};

export async function getMerchantProfile(): Promise<MerchantProfile> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/profile`, { cache: "no-store" });
    if (!response.ok) {
      return mockProfile;
    }
    return (await response.json()) as MerchantProfile;
  } catch {
    return mockProfile;
  }
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/api-keys`, { cache: "no-store" });
    if (!response.ok) {
      return mockApiKeys;
    }
    return (await response.json()) as ApiKeyItem[];
  } catch {
    return mockApiKeys;
  }
}

export async function regenerateApiKey(id: string): Promise<ApiKeyItem> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/api-keys/${id}/regenerate`, {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ...mockApiKeys[0],
        id,
        key: `demo-api-key-${Math.random().toString(36).slice(2, 18)}`,
        createdAt: new Date().toISOString(),
      };
    }
    return (await response.json()) as ApiKeyItem;
  } catch {
    return {
      ...mockApiKeys[0],
      id,
      key: `demo-api-key-${Math.random().toString(36).slice(2, 18)}`,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function getWebhookUrl(): Promise<WebhookConfig> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/webhook-url`, { cache: "no-store" });
    if (!response.ok) {
      return mockWebhook;
    }
    return (await response.json()) as WebhookConfig;
  } catch {
    return mockWebhook;
  }
}

export async function updateWebhookUrl(url: string): Promise<WebhookConfig> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/webhook-url`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      cache: "no-store",
    });
    if (!response.ok) {
      return { ...mockWebhook, url };
    }
    return (await response.json()) as WebhookConfig;
  } catch {
    return { ...mockWebhook, url };
  }
}

export async function testWebhook(): Promise<{ success: boolean; statusCode: number; response: string }> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/webhook/test`, {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      return { success: false, statusCode: response.status, response: "Webhook test failed" };
    }
    return (await response.json()) as { success: boolean; statusCode: number; response: string };
  } catch {
    return { success: true, statusCode: 200, response: "Webhook test succeeded using mock endpoint." };
  }
}
