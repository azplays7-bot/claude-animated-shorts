import { Config } from "@remotion/cli/config";

// GPU via ANGLE by default; REMOTION_GL=swangle for headless Linux without a GPU. CHROME_PATH picks a browser binary.
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as "angle" | "swangle" | "egl" | "vulkan") || "angle");
if (process.env.CHROME_PATH) Config.setBrowserExecutable(process.env.CHROME_PATH);
Config.setVideoImageFormat("jpeg");
