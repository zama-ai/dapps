import type { GatsbyConfig } from 'gatsby';
import dotenv from 'dotenv';

if (process.env.NODE_ENV) {
  dotenv.config({
    path: `.env.${process.env.NODE_ENV}`,
  });
} else {
  dotenv.config({
    path: `.env`,
  });
}
const config: GatsbyConfig = {
  siteMetadata: {
    title: `Zama dApps`,
    siteUrl: `https://blockchain.demo.zama.ai`,
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: ['gatsby-plugin-postcss', 'gatsby-plugin-emotion'],
};

export default config;
