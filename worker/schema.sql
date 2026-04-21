CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openId TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  loginMethod TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastSignedIn TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id),
  campaignName TEXT NOT NULL,
  campaignStatus TEXT,
  specialAdCategories TEXT,
  specialAdCategoryCountry TEXT,
  campaignObjective TEXT,
  buyingType TEXT,
  campaignSpendLimit INTEGER,
  campaignDailyBudget INTEGER,
  campaignLifetimeBudget INTEGER,
  campaignBidStrategy TEXT,
  budgetLevel TEXT NOT NULL DEFAULT 'ad_set',
  isDraft INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adSets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaignId INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  adSetName TEXT NOT NULL,
  adSetRunStatus TEXT,
  adSetTimeStart TEXT,
  adSetTimeStop TEXT,
  adSetDailyBudget INTEGER,
  adSetLifetimeBudget INTEGER,
  adSetBidStrategy TEXT,
  minimumROAS INTEGER,
  link TEXT,
  optimizationGoal TEXT,
  billingEvent TEXT,
  country TEXT NOT NULL DEFAULT 'United States',
  geoType TEXT NOT NULL DEFAULT 'city',
  geoLocation TEXT,
  ageRange TEXT,
  gender TEXT DEFAULT 'all',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
