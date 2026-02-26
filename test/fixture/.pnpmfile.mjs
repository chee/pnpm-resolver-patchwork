import { createPnpmPlugin } from "../../dist/index.js"
const patchwork = createPnpmPlugin()
export const resolvers = [...patchwork.resolvers]
export const fetchers = [...patchwork.fetchers]
