import { join } from 'node:path';
import { cwd, stdout } from 'node:process';

import { envConfig } from '@/config/env.config';
import { updateEnvFile } from '@/config/env-file';
import { callGraph } from '@/instagram/graph-client';

type TokenResponse = { access_token: string };
type PageEntry = { name: string; access_token: string; instagram_business_account?: { id: string; username: string } };
type PagesResponse = { 'data': PageEntry[] };

async function exchangeForLongLivedToken(): Promise<string> {
  const response = (await callGraph('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: envConfig.metaAppId,
    client_secret: envConfig.metaAppSecret,
    fb_exchange_token: envConfig.instagramToken,
  })) as TokenResponse;
  return response.access_token;
}

async function findInstagramPage(userToken: string): Promise<PageEntry> {
  const fields = 'name,access_token,instagram_business_account{id,username}';
  const response = (await callGraph('me/accounts', { fields, access_token: userToken })) as PagesResponse;
  const page = response.data.find((entry) => entry.instagram_business_account !== undefined);
  if (!page) throw new Error('No Facebook page with a linked Instagram account was found for this token');
  return page;
}

/**
 * One-time setup: swaps the short-lived Graph API Explorer token for a Page token that does not expire,
 * and writes it with the Instagram business id into .env. Tokens are never printed.
 */
async function setupInstagram(): Promise<void> {
  if (!envConfig.instagramToken || !envConfig.metaAppId || !envConfig.metaAppSecret) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN, META_APP_ID and META_APP_SECRET must be set in .env');
  }
  const page = await findInstagramPage(await exchangeForLongLivedToken());
  const account = page.instagram_business_account;
  if (!account) throw new Error('The page has no Instagram account');
  updateEnvFile(join(cwd(), '.env'), { INSTAGRAM_ACCESS_TOKEN: page.access_token, INSTAGRAM_BUSINESS_ID: account.id });
  stdout.write(`Saved a permanent token for page "${page.name}" and Instagram @${account.username} to .env\n`);
}

void setupInstagram();
