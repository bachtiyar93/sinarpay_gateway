export type MerchantProfile = {
  id: string;
  name: string;
  email?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  balance: number;
};

export type LoginProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
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

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiBaseUrl = `${baseUrl}/api`;
const fallbackMerchantApiKey = process.env.NEXT_PUBLIC_MERCHANT_API_KEY ?? "merchant-demo-key";

function getMerchantApiKey() {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("merchantApiKey") ?? fallbackMerchantApiKey;
  }

  return fallbackMerchantApiKey;
}

function persistMerchantApiKey(apiKey: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("merchantApiKey", apiKey);
  }
}

export async function getMerchantProfile(): Promise<MerchantProfile> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/profile`, {
    cache: "no-store",
    headers: { Accept: "application/json", "x-api-key": getMerchantApiKey() },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load merchant profile: ${response.status}`);
  }
  return (await response.json()) as MerchantProfile;
}

export async function updateMerchantProfile(name: string): Promise<MerchantProfile> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/profile`, {
    method: "PUT",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to update merchant profile: ${response.status}`);
  }
  return (await response.json()) as MerchantProfile;
}

export async function getLoginProfile(): Promise<LoginProfile> {
  const response = await fetch("/api/account/profile", {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load login profile: ${response.status}`);
  }
  return (await response.json()) as LoginProfile;
}

export async function updateLoginProfile(payload: {
  email: string;
  password?: string;
}): Promise<LoginProfile> {
  const response = await fetch("/api/account/profile", {
    method: "PUT",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to update login profile: ${response.status}`);
  }
  return (await response.json()) as LoginProfile;
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/api-keys`, {
    cache: "no-store",
    headers: { Accept: "application/json", "x-api-key": getMerchantApiKey() },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load API keys: ${response.status}`);
  }
  return (await response.json()) as ApiKeyItem[];
}

export async function regenerateApiKey(id: string): Promise<ApiKeyItem> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/api-keys/${id}/regenerate`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to regenerate API key: ${response.status}`);
  }
  const data = (await response.json()) as ApiKeyItem;
  persistMerchantApiKey(data.key);
  return data;
}

export async function getWebhookUrl(): Promise<WebhookConfig> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/webhook-url`, {
    cache: "no-store",
    headers: { Accept: "application/json", "x-api-key": getMerchantApiKey() },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load webhook URL: ${response.status}`);
  }
  return (await response.json()) as WebhookConfig;
}

export async function updateWebhookUrl(url: string): Promise<WebhookConfig> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/webhook-url`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
    body: JSON.stringify({ url }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to update webhook URL: ${response.status}`);
  }
  return (await response.json()) as WebhookConfig;
}

export async function testWebhook(): Promise<{ success: boolean; statusCode: number; response: string }> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/webhook/test`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Webhook test failed: ${response.status}`);
  }
  return (await response.json()) as { success: boolean; statusCode: number; response: string };
}
