import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/branding/brand-mark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<BrandMark size={512} padding={0} />, { width: 512, height: 512 });
}
