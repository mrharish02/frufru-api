DROP TABLE IF EXISTS AllocationSettings;

CREATE TABLE IF NOT EXISTS AllocationSettings (
    SID INTEGER PRIMARY KEY,
    BoxCount INTEGER,
    CutOffTime TEXT,
    PriorityStockDisposal INTEGER,
    DuplicateOrderAlert INTEGER,
    SizeAllocationRatioAlert INTEGER,
    RankAProductPrioritization INTEGER,
    RankAStrawberriesPrioritization INTEGER,
    CustomerRequestPrioritization INTEGER
);

DROP TABLE IF EXISTS orderdata;

CREATE TABLE orderdata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fileName TEXT UNIQUE NOT NULL,
    uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploadStatus TEXT,
    fileSize INTEGER
);

DROP TABLE IF EXISTS masterdata;

DROP TABLE IF EXISTS mastermetadata;

DROP TABLE IF EXISTS masterdatametadata;
-- CREATE TABLE IF NOT EXISTS masterdata ( orderID VARCHAR(20) PRIMARY KEY, companyName VARCHAR(255), zipCode VARCHAR(20), perfecture VARCHAR(100), address TEXT, apartmentName VARCHAR(255), customerRank INTEGER, isAlternativeVariety BOOLEAN, isAlternativeSize BOOLEAN, prohibitedVarieties TEXT, prohibitedFarms TEXT);

CREATE TABLE IF NOT EXISTS mastermetadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fileName TEXT UNIQUE NOT NULL,
    uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploadStatus TEXT,
    fileSize INTEGER
);

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
    FOREIGN KEY (filename) REFERENCES mastermetadata (fileName) ON DELETE CASCADE
);
CREATE TABLE productMaster (
    product_code VARCHAR(50) NOT NULL, 
    product_name VARCHAR(255) NOT NULL, 
    size VARCHAR(50), 
    quality VARCHAR(50),
    rule001 BOOLEAN DEFAULT FALSE, 
    rule002 BOOLEAN DEFAULT FALSE, 
    rule003 BOOLEAN DEFAULT FALSE, 
    rule004 BOOLEAN DEFAULT FALSE, 
    rule005 BOOLEAN DEFAULT FALSE, 
    rule006 BOOLEAN DEFAULT FALSE, 
    rule007 BOOLEAN DEFAULT FALSE, 
    rule008 BOOLEAN DEFAULT FALSE, 
    PRIMARY KEY (product_code) 
);
CREATE TABLE jfMaster (arrival_time VARCHAR(50) NOT NULL, 
    location VARCHAR(100) NOT NULL, 
    category CHAR(1) NOT NULL,  
);

CREATE TABLE shippingMaster (
    FarmCode VARCHAR(10) PRIMARY KEY,
    FarmName VARCHAR(255),
    北海道 INT,
    青森 INT,
    岩手 INT,
    宮城 INT,
    秋田 INT,
    山形 INT,
    福島 INT,
    茨城 INT,
    栃木 INT,
    群馬 INT,
    埼玉 INT,
    千葉 INT,
    東京 INT,
    神奈川 INT,
    新潟 INT,
    富山 INT,
    石川 INT,
    福井 INT,
    山梨 INT,
    長野 INT,
    岐阜 INT,
    静岡 INT,
    愛知 INT,
    三重 INT,
    滋賀 INT,
    京都 INT,
    大阪 INT,
    兵庫 INT,
    奈良 INT,
    和歌山 INT,
    鳥取 INT,
    島根 INT,
    岡山 INT,
    広島 INT,
    山口 INT,
    徳島 INT,
    香川 INT,
    愛媛 INT,
    高知 INT,
    福岡 INT,
    佐賀 INT,
    長崎 INT,
    熊本 INT,
    大分 INT,
    宮崎 INT,
    鹿児島 INT,
    沖縄 INT
);

CREATE TABLE heightMaster (
    FarmCode VARCHAR(50) PRIMARY KEY,
    FarmName VARCHAR(255),
    SizeXXcm VARCHAR(50),
    優先 INT,
    S INT,
    M INT,
    訳あり小 INT,
    L INT,
    2L INT,
    3L INT,
    4L INT,
    訳あり中 INT,
    5L INT,
    訳あり大 INT
);


CREATE TABLE shippingDaysMaster (
    FarmCode VARCHAR(50) PRIMARY KEY,
    FarmName VARCHAR(255),
    SizeXXcm VARCHAR(50),
    北海道 INT,
    青森 INT,
    岩手 INT,
    宮城 INT,
    秋田 INT,
    山形 INT,
    福島 INT,
    茨城 INT,
    栃木 INT,
    群馬 INT,
    埼玉 INT,
    千葉 INT,
    東京 INT,
    神奈川 INT,
    新潟 INT,
    富山 INT,
    石川 INT,
    福井 INT,
    山梨 INT,
    長野 INT,
    岐阜 INT,
    静岡 INT,
    愛知 INT,
    三重 INT,
    滋賀 INT,
    京都 INT,
    大阪 INT,
    兵庫 INT,
    奈良 INT,
    和歌山 INT,
    鳥取 INT,
    島根 INT,
    岡山 INT,
    広島 INT,
    山口 INT,
    徳島 INT,
    香川 INT,
    愛媛 INT,
    高知 INT,
    福岡 INT,
    佐賀 INT,
    長崎 INT,
    熊本 INT,
    大分 INT,
    宮崎 INT,
    鹿児島 INT,
    沖縄 INT
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
    status TEXT,
    FOREIGN KEY (fileId) REFERENCES orderdata (id) ON DELETE CASCADE
);