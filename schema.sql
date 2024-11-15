DROP TABLE IF EXISTS AllocationSettings;
CREATE TABLE IF NOT EXISTS AllocationSettings (SID INTEGER PRIMARY KEY, BoxCount INTEGER, CutOffTime TEXT, PriorityStockDisposal INTEGER, DuplicateOrderAlert INTEGER, SizeAllocationRatioAlert INTEGER, RankAProductPrioritization INTEGER, RankAStrawberriesPrioritization INTEGER, CustomerRequestPrioritization INTEGER);
DROP TABLE IF EXISTS orderdata;
CREATE TABLE orderdata (id INTEGER PRIMARY KEY AUTOINCREMENT, fileName TEXT UNIQUE NOT NULL, uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, uploadStatus TEXT, fileSize INTEGER);
DROP TABLE IF EXISTS masterdata;
DROP TABLE IF EXISTS mastermetadata;
DROP TABLE IF EXISTS masterdatametadata;
-- CREATE TABLE IF NOT EXISTS masterdata ( orderID VARCHAR(20) PRIMARY KEY, companyName VARCHAR(255), zipCode VARCHAR(20), perfecture VARCHAR(100), address TEXT, apartmentName VARCHAR(255), customerRank INTEGER, isAlternativeVariety BOOLEAN, isAlternativeSize BOOLEAN, prohibitedVarieties TEXT, prohibitedFarms TEXT);

-- Table to store metadata about each uploaded file for masterdata
CREATE TABLE IF NOT EXISTS mastermetadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT, fileName TEXT UNIQUE NOT NULL, uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, uploadStatus TEXT, fileSize INTEGER
);

-- Main masterdata table with a foreign key linking to masterdatametadata
CREATE TABLE IF NOT EXISTS masterdata (
  orderID VARCHAR(20),
  companyName VARCHAR(255),
  zipCode VARCHAR(20),
  perfecture VARCHAR(100),
  address TEXT,
  apartmentName VARCHAR(255),
  customerRank INTEGER,
  isAlternativeVariety BOOLEAN,
  isAlternativeSize BOOLEAN,
  prohibitedVarieties TEXT,
  prohibitedFarms TEXT,
  fileName Text,
  FOREIGN KEY (filename) REFERENCES mastermetadata(fileName) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS uploadedOrderData (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  SystemUploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  OrderDate DATE,
  OrderNo TEXT,
  ProductCode TEXT,
  Quantity INTEGER,
  CustomerCode TEXT,
  Message TEXT,
  DesiredDeliveryDate DATE,
  DesiredDeliveryTime TIME,
  fileId INTEGER,
  FOREIGN KEY (fileId) REFERENCES orderdata(id) ON DELETE CASCADE
);