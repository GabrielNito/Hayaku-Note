import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.15.2", "192.168.15.3"]
}

export default nextConfig
