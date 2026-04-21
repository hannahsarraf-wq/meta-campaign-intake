import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ENV
vi.mock('./_core/env', () => ({
  ENV: {
    metaAccessToken: 'test_token_123',
    metaAppId: '875807611463577',
  },
}));

describe('Meta Marketing API Credentials', () => {
  it('should have META_ACCESS_TOKEN configured', () => {
    const token = process.env.META_ACCESS_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it('should have META_APP_ID configured', () => {
    const appId = process.env.META_APP_ID;
    expect(appId).toBeDefined();
    expect(appId).toBe('875807611463577');
  });
});

describe('Meta API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('createMetaCampaign', () => {
    it('should create a campaign with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });

      const { createMetaCampaign } = await import('./meta-api');

      const result = await createMetaCampaign('act_123456789', {
        campaignName: 'Test Campaign',
        campaignStatus: 'PAUSED',
        campaignObjective: 'Outcome Traffic',
        buyingType: 'AUCTION',
        specialAdCategories: 'None',
        budgetLevel: 'ad_set',
      });

      expect(result.id).toBe('120123456789');
      expect(result.success).toBe(true);

      // Verify the fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/act_123456789/campaigns');
      expect(options.method).toBe('POST');

      // Parse the body to verify parameters
      const body = new URLSearchParams(options.body);
      expect(body.get('name')).toBe('Test Campaign');
      expect(body.get('objective')).toBe('OUTCOME_TRAFFIC');
      expect(body.get('status')).toBe('PAUSED');
      expect(body.get('access_token')).toBe('test_token_123');
    });

    it('should handle CBO campaign with budget at campaign level', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });

      const { createMetaCampaign } = await import('./meta-api');

      await createMetaCampaign('123456789', {
        campaignName: 'CBO Campaign',
        campaignStatus: 'PAUSED',
        campaignObjective: 'Outcome Sales',
        buyingType: 'AUCTION',
        specialAdCategories: 'None',
        campaignBidStrategy: 'Lowest Cost',
        campaignDailyBudget: 5000, // $50 in cents
        budgetLevel: 'campaign',
      });

      const body = new URLSearchParams(mockFetch.mock.calls[0][1].body);
      expect(body.get('daily_budget')).toBe('5000');
      expect(body.get('bid_strategy')).toBe('LOWEST_COST_WITHOUT_CAP');
    });

    it('should add act_ prefix if missing', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });

      const { createMetaCampaign } = await import('./meta-api');

      await createMetaCampaign('123456789', {
        campaignName: 'Test',
        campaignStatus: 'PAUSED',
        campaignObjective: 'Outcome Traffic',
        buyingType: 'AUCTION',
        budgetLevel: 'ad_set',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/act_123456789/campaigns');
    });

    it('should not double-prefix act_', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });

      const { createMetaCampaign } = await import('./meta-api');

      await createMetaCampaign('act_123456789', {
        campaignName: 'Test',
        campaignStatus: 'PAUSED',
        campaignObjective: 'Outcome Traffic',
        buyingType: 'AUCTION',
        budgetLevel: 'ad_set',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/act_123456789/campaigns');
      expect(url).not.toContain('/act_act_');
    });

    it('should throw on Meta API error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          error: {
            message: 'Invalid OAuth access token.',
            type: 'OAuthException',
            code: 190,
          },
        }),
      });

      const { createMetaCampaign } = await import('./meta-api');

      await expect(
        createMetaCampaign('act_123456789', {
          campaignName: 'Test',
          campaignStatus: 'PAUSED',
          campaignObjective: 'Outcome Traffic',
          buyingType: 'AUCTION',
          budgetLevel: 'ad_set',
        })
      ).rejects.toThrow('Meta API Error: Invalid OAuth access token.');
    });

    it('should map special ad categories correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });

      const { createMetaCampaign } = await import('./meta-api');

      await createMetaCampaign('act_123456789', {
        campaignName: 'Housing Campaign',
        campaignStatus: 'PAUSED',
        campaignObjective: 'Outcome Leads',
        buyingType: 'AUCTION',
        specialAdCategories: 'housing',
        specialAdCategoryCountry: 'US',
        budgetLevel: 'ad_set',
      });

      const body = new URLSearchParams(mockFetch.mock.calls[0][1].body);
      expect(body.get('special_ad_categories')).toBe('["HOUSING"]');
      expect(body.get('special_ad_category_country')).toBe('["US"]');
    });
  });

  describe('createMetaAdSet', () => {
    it('should create an ad set with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120987654321', success: true }),
      });

      const { createMetaAdSet } = await import('./meta-api');

      const result = await createMetaAdSet(
        'act_123456789',
        '120123456789',
        {
          adSetName: 'Test Ad Set',
          adSetRunStatus: 'ACTIVE',
          adSetDailyBudget: 1000,
          optimizationGoal: 'LINK_CLICKS',
          billingEvent: 'IMPRESSIONS',
          country: 'United States',
          geoType: 'city',
          geoLocation: 'New York, NY',
        },
        'ad_set'
      );

      expect(result.id).toBe('120987654321');
      expect(result.success).toBe(true);

      const body = new URLSearchParams(mockFetch.mock.calls[0][1].body);
      expect(body.get('name')).toBe('Test Ad Set');
      expect(body.get('campaign_id')).toBe('120123456789');
      expect(body.get('daily_budget')).toBe('1000');
      expect(body.get('optimization_goal')).toBe('LINK_CLICKS');
      expect(body.get('billing_event')).toBe('IMPRESSIONS');
    });

    it('should not set budget at ad set level when CBO', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120987654321', success: true }),
      });

      const { createMetaAdSet } = await import('./meta-api');

      await createMetaAdSet(
        'act_123456789',
        '120123456789',
        {
          adSetName: 'CBO Ad Set',
          adSetRunStatus: 'ACTIVE',
          adSetDailyBudget: 1000,
          optimizationGoal: 'LINK_CLICKS',
          billingEvent: 'IMPRESSIONS',
          country: 'United States',
        },
        'campaign' // CBO mode
      );

      const body = new URLSearchParams(mockFetch.mock.calls[0][1].body);
      // Budget should NOT be set at ad set level when CBO
      expect(body.get('daily_budget')).toBeNull();
    });
  });

  describe('pushCampaignToMeta', () => {
    it('should create campaign and ad sets in sequence', async () => {
      // First call: create campaign
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });
      // Second call: create ad set
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120987654321', success: true }),
      });

      const { pushCampaignToMeta } = await import('./meta-api');

      const result = await pushCampaignToMeta(
        'act_123456789',
        {
          campaignName: 'Full Campaign',
          campaignStatus: 'PAUSED',
          campaignObjective: 'Outcome Traffic',
          buyingType: 'AUCTION',
          budgetLevel: 'ad_set',
        },
        [
          {
            adSetName: 'Ad Set 1',
            adSetRunStatus: 'ACTIVE',
            adSetDailyBudget: 1000,
            optimizationGoal: 'LINK_CLICKS',
            billingEvent: 'IMPRESSIONS',
            country: 'United States',
          },
        ]
      );

      expect(result.metaCampaignId).toBe('120123456789');
      expect(result.metaAdSetIds).toEqual(['120987654321']);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle partial ad set failures gracefully', async () => {
      // Campaign succeeds
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });
      // First ad set succeeds
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120987654321', success: true }),
      });
      // Second ad set fails
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          error: { message: 'Invalid targeting', type: 'OAuthException', code: 100 },
        }),
      });

      const { pushCampaignToMeta } = await import('./meta-api');

      const result = await pushCampaignToMeta(
        'act_123456789',
        {
          campaignName: 'Partial Campaign',
          campaignStatus: 'PAUSED',
          campaignObjective: 'Outcome Traffic',
          buyingType: 'AUCTION',
          budgetLevel: 'ad_set',
        },
        [
          {
            adSetName: 'Good Ad Set',
            adSetDailyBudget: 1000,
            optimizationGoal: 'LINK_CLICKS',
            billingEvent: 'IMPRESSIONS',
          },
          {
            adSetName: 'Bad Ad Set',
            adSetDailyBudget: 1000,
            optimizationGoal: 'LINK_CLICKS',
            billingEvent: 'IMPRESSIONS',
          },
        ]
      );

      // Should still succeed with partial results
      expect(result.metaCampaignId).toBe('120123456789');
      expect(result.metaAdSetIds).toEqual(['120987654321']);
      expect(result.success).toBe(true);
    });

    it('should throw when all ad sets fail', async () => {
      // Campaign succeeds
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '120123456789', success: true }),
      });
      // Ad set fails
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          error: { message: 'Invalid targeting', type: 'OAuthException', code: 100 },
        }),
      });

      const { pushCampaignToMeta } = await import('./meta-api');

      await expect(
        pushCampaignToMeta(
          'act_123456789',
          {
            campaignName: 'Failed Campaign',
            campaignStatus: 'PAUSED',
            campaignObjective: 'Outcome Traffic',
            buyingType: 'AUCTION',
            budgetLevel: 'ad_set',
          },
          [
            {
              adSetName: 'Bad Ad Set',
              adSetDailyBudget: 1000,
              optimizationGoal: 'LINK_CLICKS',
              billingEvent: 'IMPRESSIONS',
            },
          ]
        )
      ).rejects.toThrow('Campaign created');
    });
  });

  describe('Objective mapping', () => {
    it('should map all form objectives to API values', async () => {
      const objectives = [
        { form: 'Outcome Awareness', api: 'OUTCOME_AWARENESS' },
        { form: 'Outcome Engagement', api: 'OUTCOME_ENGAGEMENT' },
        { form: 'Outcome Leads', api: 'OUTCOME_LEADS' },
        { form: 'Outcome Sales', api: 'OUTCOME_SALES' },
        { form: 'Outcome Traffic', api: 'OUTCOME_TRAFFIC' },
      ];

      for (const { form, api } of objectives) {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ id: '120123456789', success: true }),
        });

        const { createMetaCampaign } = await import('./meta-api');

        await createMetaCampaign('act_123456789', {
          campaignName: 'Test',
          campaignStatus: 'PAUSED',
          campaignObjective: form,
          buyingType: 'AUCTION',
          budgetLevel: 'ad_set',
        });

        const body = new URLSearchParams(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body);
        expect(body.get('objective')).toBe(api);
      }
    });
  });

  describe('validateAdAccount', () => {
    it('should return valid=true with account details for a valid account', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          id: 'act_123456789',
          name: 'My Test Account',
          account_status: 1,
          currency: 'USD',
          business_name: 'Test Business',
        }),
      });

      const { validateAdAccount } = await import('./meta-api');
      const result = await validateAdAccount('act_123456789');

      expect(result.valid).toBe(true);
      expect(result.accountName).toBe('My Test Account');
      expect(result.currency).toBe('USD');
      expect(result.businessName).toBe('Test Business');
      expect(result.accountId).toBe('act_123456789');
    });

    it('should return valid=false for a non-existent account', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          error: {
            message: 'Unsupported get request.',
            type: 'GraphMethodException',
            code: 100,
          },
        }),
      });

      const { validateAdAccount } = await import('./meta-api');
      const result = await validateAdAccount('act_999999999');

      expect(result.valid).toBe(false);
      expect(result.accountName).toBe('');
    });

    it('should add act_ prefix if missing', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          id: 'act_123456789',
          name: 'My Account',
          account_status: 1,
          currency: 'EUR',
        }),
      });

      const { validateAdAccount } = await import('./meta-api');
      const result = await validateAdAccount('123456789');

      expect(result.valid).toBe(true);
      expect(result.accountId).toBe('act_123456789');
      expect(result.currency).toBe('EUR');

      // Verify the URL used act_ prefix
      const [url] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(url).toContain('/act_123456789?');
    });

    it('should not double-prefix act_', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          id: 'act_123456789',
          name: 'My Account',
          account_status: 1,
          currency: 'USD',
        }),
      });

      const { validateAdAccount } = await import('./meta-api');
      await validateAdAccount('act_123456789');

      const [url] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(url).toContain('/act_123456789?');
      expect(url).not.toContain('/act_act_');
    });

    it('should handle missing fields gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          id: 'act_123456789',
          // No name, currency, or business_name
        }),
      });

      const { validateAdAccount } = await import('./meta-api');
      const result = await validateAdAccount('act_123456789');

      expect(result.valid).toBe(true);
      expect(result.accountName).toBe('Unknown');
      expect(result.currency).toBe('USD');
      expect(result.businessName).toBeUndefined();
    });
  });

  describe('Bid strategy mapping', () => {
    it('should map form bid strategies to API values', async () => {
      const strategies = [
        { form: 'Lowest Cost', api: 'LOWEST_COST_WITHOUT_CAP' },
        { form: 'Lowest Cost With Bid Cap', api: 'LOWEST_COST_WITH_BID_CAP' },
        { form: 'Cost per result goal', api: 'COST_CAP' },
        { form: 'ROAS goal', api: 'LOWEST_COST_WITH_MIN_ROAS' },
        { form: 'Highest volume or value', api: 'LOWEST_COST_WITHOUT_CAP' },
        { form: 'Bid Cap', api: 'LOWEST_COST_WITH_BID_CAP' },
      ];

      for (const { form, api } of strategies) {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ id: '120123456789', success: true }),
        });

        const { createMetaCampaign } = await import('./meta-api');

        await createMetaCampaign('act_123456789', {
          campaignName: 'Test',
          campaignStatus: 'PAUSED',
          campaignObjective: 'Outcome Traffic',
          buyingType: 'AUCTION',
          campaignBidStrategy: form,
          campaignDailyBudget: 5000,
          budgetLevel: 'campaign',
        });

        const body = new URLSearchParams(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body);
        expect(body.get('bid_strategy')).toBe(api);
      }
    });
  });
});
