// Stub: vendor integrations removed — Anthropic protocol only
import type { AnthropicProxyDescriptor, BrandDescriptor, GatewayDescriptor, ModelDescriptor, ProviderPresetManifestEntry, VendorDescriptor } from '../descriptors.js'

export const ANTHROPIC_PROXY_DESCRIPTORS: readonly AnthropicProxyDescriptor[] = []
export const BRAND_DESCRIPTORS: readonly BrandDescriptor[] = []
export const GATEWAY_DESCRIPTORS: readonly GatewayDescriptor[] = []
export const MODEL_DESCRIPTOR_GROUPS: readonly { brandId: string; models: readonly ModelDescriptor[] }[] = []
export const VENDOR_DESCRIPTORS: readonly VendorDescriptor[] = []
export const PROVIDER_PRESET_MANIFEST: readonly ProviderPresetManifestEntry[] = []
export type ProviderPreset = (typeof PROVIDER_PRESET_MANIFEST)[number]['preset']
export const ORDERED_PROVIDER_PRESETS: readonly string[] = []
export const ALL_VENDORS: readonly VendorDescriptor[] = []
export const ALL_GATEWAYS: readonly GatewayDescriptor[] = []
export const ALL_BRANDS: readonly BrandDescriptor[] = []
export const ALL_MODELS: readonly ModelDescriptor[] = []
