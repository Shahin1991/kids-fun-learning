import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/branding/brand-mark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<BrandMark size={192} padding={0} />, { width: 192, height: 192 });
}
