// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

//    _______     __        _______    __     ___      ___  ____  ____  ___________  ____  ____   _______  ___
//   |   __ "\   /""\      /"      \  |" \   |"  \    /"  |("  _||_ " |("     _   ")("  _||_ " | /"     "||"  |
//   (. |__) :) /    \    |:        | ||  |   \   \  //   ||   (  ) : | )__/  \\__/ |   (  ) : |(: ______)||  |
//   |:  ____/ /' /\  \   |_____/   ) |:  |   /\\  \/.    |(:  |  | . )    \\_ /    (:  |  | . ) \/    |  |:  |
//   (|  /    //  __'  \   //      /  |.  |  |: \.        | \\ \__/ //     |.  |     \\ \__/ //  // ___)_  \  |___
//  /|__/ \  /   /  \\  \ |:  __   \  /\  |\ |.  \    /:  | /\\ __ //\     \:  |     /\\ __ //\ (:      "|( \_|:  \
// (_______)(___/    \___)|__|  \___)(__\_|_)|___|\__/|___|(__________)     \__|    (__________) \_______) \_______)

import {Array} from "./libraries/Array.sol";
import {Math} from "./libraries/Math.sol";
import {PriceFeed} from "./interfaces/PriceFeed.sol";
import {IERC20} from "./interfaces/IERC20.sol";

contract Parimutuel {
    using Array for address[];

    // mapping(address => bool) private admins;
    address private admin;
    address private feeCollector;
    PriceFeed private oracle;
    IERC20 private usd;

    mapping(address => Position) private shorts;
    mapping(address => Liquidity) private shortLPs;
    uint256 public shortTokens;
    uint256 private shortShares;
    uint256 private shortActiveShares;
    uint256 private shortFunds;
    uint256 private shortProfits;

    mapping(address => Position) private longs;
    mapping(address => Liquidity) private longLPs;
    uint256 public longTokens;
    uint256 private longShares;
    uint256 private longActiveShares;
    uint256 private longFunds;
    uint256 private longProfits;

    address[] private shortUsers;
    address[] private longUsers;

    uint256 private constant PRECISION = 10 ** 8;
    uint256 private constant MIN_LEVERAGE = 2 * PRECISION;
    uint256 private constant MAX_LEVERAGE = 100 * PRECISION;
    uint256 private constant FUNDING_INTERVAL = 900; // 60
    uint256 private constant FUNDING_PERIODS = 96; // 1
    uint256 private constant FAUCET_AMOUNT = 10_000 * PRECISION;
    //uint256 private constant BPS = 10000;
    //uint256 private constant FEE = 200;

    struct Position {
        address owner;
        uint256 margin;
        uint256 leverage;
        uint256 tokens;
        uint256 shares;
        uint256 activeShares;
        uint256 value;
        uint256 entry;
        uint256 liquidation;
        uint256 profit;
        uint256 funding;
        bool active;
    }

    struct Liquidity {
        address owner;
        uint256 tokens;
        uint256 shares;
        bool active;
    }

    error PositionActiveError();
    error NotAuthorized();
    error FundingRateNotDue();
    error InvalidLeverage();
    error LeverageFeeExceedsMargin();
    error NotLiquidatable();
    error NotClosableLoss();
    error NotClosableProfit();

    event ShortPositionOpened();
    event ShortMarginAdded();
    event ShortLiquidated();
    event ShortLoss();
    event ShortProfit();
    event ShortFundingPaid();

    event LongPositionOpened();
    event LongMarginAdded();
    event LongLiquidated();
    event LongLoss();
    event LongProfit();
    event LongFundingPaid();

    /// ============================================================================================
    /// Constructor
    /// ============================================================================================

    constructor(address _usd, address _oracle) {
        admin = msg.sender;
        feeCollector = msg.sender;
        usd = IERC20(_usd);
        oracle = PriceFeed(_oracle);
    }

    /// ============================================================================================
    /// Short Core Logic
    /// ============================================================================================

    function shortAddLiquidity(address user, uint256 tokens) external {
        usd.transferFrom(msg.sender, address(this), tokens);

        uint256 _shares = shares(tokens, shortTokens);
        uint256 totalShares = shortShares + _shares;
        uint256 liquidityFee = (_shares * shortProfits) / totalShares;
        uint256 depositAfterFee = tokens - liquidityFee;

        shortProfits += liquidityFee;
        shortTokens += tokens;
        shortShares += _shares;
        shortActiveShares += _shares;

        shortLPs[user] = Liquidity({
            owner: user,
            tokens: depositAfterFee,
            shares: _shares,
            active: true
        });
    }

    function shortRemoveLiquidity(address user) external {
        Liquidity storage liquidity = shortLPs[user];
        uint256 profit = (liquidity.shares * shortProfits) / shortShares;
        uint256 netProfit = (profit * (10000 - 200)) / 10000;
        uint256 fee = profit - netProfit;

        shortProfits -= profit;
        shortTokens -= liquidity.tokens;
        shortShares -= liquidity.shares;
        shortActiveShares -= liquidity.shares;

        usd.transfer(user, netProfit);
        usd.transfer(feeCollector, fee);

        delete shortLPs[user];
    }

    function shortOpen(
        address user,
        uint256 margin,
        uint256 leverage
    ) external {
        shortActive(user, false);

        usd.transferFrom(msg.sender, address(this), margin);
        _shortOpen(user, margin, leverage);
    }

    function _shortOpen(
        address user,
        uint256 margin,
        uint256 leverage
    ) internal {
        uint256 _tokens = (margin * leverage) / PRECISION;
        uint256 _shares = shares(_tokens, shortTokens);
        uint256 _entry = currentPrice();
        uint256 _leverageFee;
        uint256 _margin;

        if (shortTokens == 0) {
            _margin = margin;
        } else {
            _leverageFee = leverageFee(_tokens, _shares, shortShares);
            if (_leverageFee >= margin) revert LeverageFeeExceedsMargin();
            _margin = margin - _leverageFee;
        }

        uint256 _leverage = leverageCalc(_tokens, _margin);

        shortProfits += _leverageFee;
        shortTokens += _tokens;
        shortShares += _shares;
        shortUsers.push(user);

        shorts[user] = Position({
            owner: user,
            margin: _margin,
            leverage: _leverage,
            tokens: _tokens,
            shares: _shares,
            activeShares: 0,
            value: _margin,
            entry: _entry,
            liquidation: shortLiqCalc(_entry, _leverage),
            profit: shortProfitCalc(_entry, _leverage),
            funding: block.timestamp + FUNDING_INTERVAL,
            active: true
        });

        emit ShortPositionOpened();
    }

    function shortAddMargin(uint256 amount) external {
        shortActive(msg.sender, true);

        usd.transferFrom(msg.sender, address(this), amount);
        Position storage pos = shorts[msg.sender];
        shortActiveShareUpdate(msg.sender);

        pos.margin += amount;
        pos.leverage = leverageCalc(pos.tokens, pos.margin);
        pos.liquidation = shortLiqCalc(pos.entry, pos.leverage);
        pos.profit = shortProfitCalc(pos.entry, pos.leverage);

        emit ShortMarginAdded();
    }

    function shortFundRate(address user) public {
        shortActive(user, true);

        Position storage pos = shorts[user];
        require(block.timestamp >= pos.funding, FundingRateNotDue());
        uint256 fundingFee;

        if (shortTokens <= longTokens) {
            fundingFee = 0;
        } else {
            uint256 totalTokens = shortTokens + longTokens;
            uint256 difference = shortTokens - longTokens;
            uint256 funding = totalTokens / difference;
            uint256 margin = (pos.tokens * PRECISION) / pos.leverage;
            uint256 dailyRate = margin / funding;
            fundingFee = dailyRate / FUNDING_PERIODS;
        }

        if (fundingFee >= pos.margin) return shortClose(user);

        pos.margin -= fundingFee;
        longFunds += fundingFee;
        pos.funding += FUNDING_INTERVAL;
        shortActiveShareUpdate(user);
        pos.leverage = leverageCalc(pos.tokens, pos.margin);
        pos.liquidation = shortLiqCalc(pos.entry, pos.leverage);
        pos.profit = shortProfitCalc(pos.entry, pos.leverage);

        emit ShortFundingPaid();
    }

    function shortClose(address user) public {
        shortActive(user, true);
        onlyOwnerOrAdmin(user);

        Position storage pos = shorts[user];
        uint256 price = currentPrice();

        if (price >= pos.liquidation) {
            shortLiquidate(user);
        } else if (price >= pos.entry) {
            shortCloseLoss(user);
        } else if (price < pos.entry) {
            shortCloseProfit(user);
        }
    }

    function shortLiquidate(address user) public {
        shortActive(user, true);
        onlyOwnerOrAdmin(user);

        Position storage pos = shorts[user];
        uint256 price = currentPrice();
        require(price >= pos.liquidation, NotLiquidatable());

        shortTokens -= pos.tokens;
        shortShares -= pos.shares;
        shortActiveShares -= pos.activeShares;
        longProfits += pos.margin;

        emit ShortLiquidated();
        shortUsers.remove(user);
        delete shorts[user];
    }

    function shortCloseLoss(address user) internal {
        Position storage pos = shorts[user];

        uint256 marginValue = shortMarginValue(user);
        uint256 fundValue = shortFundValue(user);
        uint256 loss = pos.margin - marginValue;

        shortTokens -= pos.tokens;
        shortShares -= pos.shares;
        shortActiveShares -= pos.activeShares;
        shortFunds -= fundValue;
        longProfits += loss;
        usd.transfer(user, marginValue + fundValue);

        emit ShortLoss();
        shortUsers.remove(user);
        delete shorts[user];
    }

    function shortCloseProfit(address user) internal {
        onlyOwnerOrAdmin(user);

        Position storage pos = shorts[user];
        uint256 price = currentPrice();
        require(price < pos.entry, NotClosableProfit());
        shortActiveShareUpdate(user);

        uint256 shareProfits = shortShareValue(user);
        uint256 fundProfits = shortFundValue(user);
        uint256 netShareProfit = (shareProfits * (10000 - 200)) / 10000;
        uint256 netFundProfit = (fundProfits * (10000 - 200)) / 10000;
        uint256 shareFee = shareProfits - netShareProfit;
        uint256 fundFee = fundProfits - netFundProfit;

        shortTokens -= pos.tokens;
        shortShares -= pos.shares;
        shortActiveShares -= pos.activeShares;
        shortFunds -= fundProfits;
        shortProfits -= shareProfits;

        usd.transfer(user, pos.margin + netShareProfit + netFundProfit);
        usd.transfer(feeCollector, shareFee + fundFee);

        emit ShortProfit();
        shortUsers.remove(user);
        delete shorts[user];
    }

    function shortActiveShareUpdate(address user) internal {
        Position storage pos = shorts[user];
        uint256 startingActiveShares = pos.activeShares;
        uint256 price = currentPrice();
        uint256 _activeShares;

        if (price <= pos.profit) {
            _activeShares = pos.shares;
        } else if (price >= pos.entry) {
            _activeShares = 0;
        } else {
            uint256 numerator = price - pos.profit;
            uint256 denominator = pos.entry - pos.profit;
            _activeShares = (pos.shares * numerator) / denominator;
        }

        pos.activeShares = _activeShares;
        shortActiveShares -= startingActiveShares;
        shortActiveShares += pos.activeShares;
        pos.value =
            shortMarginValue(user) +
            shortShareValue(user) +
            shortFundValue(user);
    }

    function shortMarginValue(
        address user
    ) public view returns (uint256 marginValue) {
        Position storage pos = shorts[user];
        uint256 price = currentPrice();

        marginValue =
            (pos.margin * (pos.liquidation - price)) /
            (pos.liquidation - pos.entry);

        return marginValue;
    }

    function shortShareValue(
        address user
    ) public view returns (uint256 shareValue) {
        shareValue =
            (shorts[user].activeShares * shortProfits) /
            shortActiveShares;
        return shareValue;
    }

    function shortFundValue(
        address user
    ) public view returns (uint256 fundValue) {
        fundValue = (shorts[user].shares * shortFunds) / shortShares;
        return fundValue;
    }

    function shortValue(address user) public view returns (uint256 value) {
        value =
            shortMarginValue(user) +
            shortShareValue(user) +
            shortFundValue(user);
        return value;
    }

    function shortLiqCalc(
        uint256 entry,
        uint256 leverage
    ) internal pure returns (uint256 liquidation) {
        return entry + ((entry * PRECISION) / leverage);
    }

    function shortProfitCalc(
        uint256 entry,
        uint256 leverage
    ) internal pure returns (uint256 profit) {
        return entry - ((entry * PRECISION) / leverage);
    }

    /// ============================================================================================
    /// Long Core Logic
    /// ============================================================================================

    function longAddLiquidity(address user, uint256 tokens) external {
        usd.transferFrom(msg.sender, address(this), tokens);

        uint256 _shares = shares(tokens, longTokens);
        uint256 totalShares = longShares + _shares;
        uint256 liquidityFee = (_shares * longProfits) / totalShares;
        uint256 depositAfterFee = tokens - liquidityFee;

        longProfits += liquidityFee;
        longTokens += tokens;
        longShares += _shares;
        longActiveShares += _shares;

        longLPs[user] = Liquidity({
            owner: user,
            tokens: depositAfterFee,
            shares: _shares,
            active: true
        });
    }

    function longRemoveLiquidity(address user) external {
        Liquidity storage liquidity = longLPs[user];
        uint256 profit = (liquidity.shares * longProfits) / longShares;
        uint256 netProfit = (profit * (10000 - 200)) / 10000;
        uint256 fee = profit - netProfit;

        longProfits -= profit;
        longTokens -= liquidity.tokens;
        longShares -= liquidity.shares;
        longActiveShares -= liquidity.shares;

        usd.transfer(user, netProfit);
        usd.transfer(feeCollector, fee);

        delete longLPs[user];
    }

    function longOpen(address user, uint256 margin, uint256 leverage) external {
        longActive(user, false);

        usd.transferFrom(msg.sender, address(this), margin);
        _longOpen(user, margin, leverage);
    }

    function _longOpen(
        address user,
        uint256 margin,
        uint256 leverage
    ) internal {
        uint256 _tokens = (margin * leverage) / PRECISION;
        uint256 _shares = shares(_tokens, longTokens);
        uint256 _entry = currentPrice();
        uint256 _leverageFee;
        uint256 _margin;

        if (longTokens == 0) {
            _margin = margin;
        } else {
            _leverageFee = leverageFee(_tokens, _shares, longShares);
            if (_leverageFee >= margin) revert LeverageFeeExceedsMargin();
            _margin = margin - _leverageFee;
        }

        uint256 _leverage = leverageCalc(_tokens, _margin);

        longProfits += _leverageFee;
        longTokens += _tokens;
        longShares += _shares;
        longUsers.push(user);

        longs[user] = Position({
            owner: user,
            margin: _margin,
            leverage: _leverage,
            tokens: _tokens,
            shares: _shares,
            activeShares: 0,
            value: _margin,
            entry: _entry,
            liquidation: longLiqCalc(_entry, _leverage),
            profit: longProfitCalc(_entry, _leverage),
            funding: block.timestamp + FUNDING_INTERVAL,
            active: true
        });

        emit LongPositionOpened();
    }

    function longAddMargin(uint256 amount) external {
        longActive(msg.sender, true);

        usd.transferFrom(msg.sender, address(this), amount);
        Position storage pos = longs[msg.sender];
        longActiveShareUpdate(msg.sender);

        pos.margin += amount;
        pos.leverage = leverageCalc(pos.tokens, pos.margin);
        pos.liquidation = longLiqCalc(pos.entry, pos.leverage);
        pos.profit = longProfitCalc(pos.entry, pos.leverage);

        emit LongMarginAdded();
    }

    function longFundRate(address user) public {
        longActive(user, true);

        Position storage pos = longs[user];
        require(block.timestamp >= pos.funding, FundingRateNotDue());
        uint256 fundingFee;

        if (longTokens <= shortTokens) {
            fundingFee = 0;
        } else {
            uint256 totalTokens = longTokens + shortTokens;
            uint256 difference = longTokens - shortTokens;
            uint256 funding = totalTokens / difference;
            uint256 margin = (pos.tokens * PRECISION) / pos.leverage;
            uint256 dailyRate = margin / funding;
            fundingFee = dailyRate / FUNDING_PERIODS;
        }

        if (fundingFee >= pos.margin) return longClose(user);

        pos.margin -= fundingFee;
        shortFunds += fundingFee;
        pos.funding += FUNDING_INTERVAL;
        longActiveShareUpdate(user);
        pos.leverage = leverageCalc(pos.tokens, pos.margin);
        pos.liquidation = longLiqCalc(pos.entry, pos.leverage);
        pos.profit = longProfitCalc(pos.entry, pos.leverage);

        emit LongFundingPaid();
    }

    function longClose(address user) public {
        longActive(user, true);
        onlyOwnerOrAdmin(user);

        Position storage pos = longs[user];
        uint256 price = currentPrice();

        if (price <= pos.liquidation) {
            longLiquidate(user);
        } else if (price <= pos.entry) {
            longCloseLoss(user);
        } else if (price > pos.entry) {
            longCloseProfit(user);
        }
    }

    function longLiquidate(address user) public {
        longActive(user, true);
        onlyOwnerOrAdmin(user);

        Position storage pos = longs[user];
        uint256 price = currentPrice();
        require(price <= pos.liquidation, NotLiquidatable());

        longTokens -= pos.tokens;
        longShares -= pos.shares;
        longActiveShares -= pos.activeShares;
        shortProfits += pos.margin;

        emit LongLiquidated();
        longUsers.remove(user);
        delete longs[user];
    }

    function longCloseLoss(address user) internal {
        Position storage pos = longs[user];
        uint256 price = currentPrice();
        require(price <= pos.entry, NotClosableLoss());

        uint256 marginValue = longMarginValue(user);
        uint256 fundValue = longFundValue(user);
        uint256 loss = pos.margin - marginValue;

        longTokens -= pos.tokens;
        longShares -= pos.shares;
        longActiveShares -= pos.activeShares;
        longFunds -= fundValue;
        shortProfits += loss;
        usd.transfer(user, marginValue + fundValue);

        emit LongLoss();
        longUsers.remove(user);
        delete longs[user];
    }

    function longCloseProfit(address user) public {
        onlyOwnerOrAdmin(user);

        Position storage pos = longs[user];
        uint256 price = currentPrice();
        require(price > pos.entry, NotClosableProfit());
        longActiveShareUpdate(user);

        uint256 shareProfits = longShareValue(user);
        uint256 fundProfits = longFundValue(user);
        uint256 netShareProfit = (shareProfits * (10000 - 200)) / 10000;
        uint256 netFundProfit = (fundProfits * (10000 - 200)) / 10000;
        uint256 shareFee = shareProfits - netShareProfit;
        uint256 fundFee = fundProfits - netFundProfit;

        longTokens -= pos.tokens;
        longShares -= pos.shares;
        longActiveShares -= pos.activeShares;
        longFunds -= fundProfits;
        longProfits -= shareProfits;

        usd.transfer(user, pos.margin + netShareProfit + netFundProfit);
        usd.transfer(feeCollector, shareFee + fundFee);

        emit LongProfit();
        longUsers.remove(user);
        delete longs[user];
    }

    function longActiveShareUpdate(address user) internal {
        Position storage pos = longs[user];
        uint256 startingActiveShares = pos.activeShares;
        uint256 price = currentPrice();
        uint256 _activeShares;

        if (price >= pos.profit) {
            _activeShares = pos.shares;
        } else if (price <= pos.entry) {
            _activeShares = 0;
        } else {
            uint256 numerator = price - pos.entry;
            uint256 denominator = pos.profit - pos.entry;
            _activeShares = (pos.shares * numerator) / denominator;
        }

        pos.activeShares = _activeShares;
        longActiveShares -= startingActiveShares;
        longActiveShares += pos.activeShares;
        pos.value =
            longMarginValue(user) +
            longShareValue(user) +
            longFundValue(user);
    }

    function longMarginValue(
        address user
    ) public view returns (uint256 marginValue) {
        Position storage pos = longs[user];
        uint256 price = currentPrice();
        marginValue =
            (pos.margin * (price - pos.liquidation)) /
            (pos.entry - pos.liquidation);
        return marginValue;
    }

    function longShareValue(
        address user
    ) public view returns (uint256 shareValue) {
        shareValue =
            (longs[user].activeShares * longProfits) /
            longActiveShares;
        return shareValue;
    }

    function longFundValue(
        address user
    ) public view returns (uint256 fundValue) {
        fundValue = (longs[user].shares * longFunds) / longShares;
        return fundValue;
    }

    function longValue(address user) public view returns (uint256 value) {
        value =
            longMarginValue(user) +
            longShareValue(user) +
            longFundValue(user);
        return value;
    }

    function longLiqCalc(
        uint256 entry,
        uint256 leverage
    ) internal pure returns (uint256 liquidation) {
        return entry - ((entry * PRECISION) / leverage);
    }

    function longProfitCalc(
        uint256 entry,
        uint256 leverage
    ) internal pure returns (uint256 profit) {
        return entry + ((entry * PRECISION) / leverage);
    }

    /// ============================================================================================
    /// Global Market State
    /// ============================================================================================

    function currentPrice() public view returns (uint256) {
        (, int256 _price, , , ) = oracle.latestRoundData();
        if (_price < 0) _price = 0;
        return uint256(_price);
    }

    function shares(
        uint256 tokens,
        uint256 marketTokens
    ) public pure returns (uint256 _shares) {
        return Math.sqrt(tokens + marketTokens) - Math.sqrt(marketTokens);
    }

    function leverageFee(
        uint256 positionTokens,
        uint256 positionShares,
        uint256 marketShares
    ) public pure returns (uint256 _leverageFee) {
        uint256 leverageRatio = marketShares / positionShares;
        return positionTokens / leverageRatio;
    }

    function leverageCalc(
        uint256 tokens,
        uint256 margin
    ) internal pure returns (uint256 leverage) {
        return (tokens * PRECISION) / margin;
    }

    function shortPositions() external view returns (Position[] memory) {
        Position[] memory positions = new Position[](shortUsers.length);
        for (uint256 i = 0; i < shortUsers.length; i++) {
            positions[i] = shorts[shortUsers[i]];
        }
        return positions;
    }

    function longPositions() external view returns (Position[] memory) {
        Position[] memory positions = new Position[](longUsers.length);
        for (uint256 i = 0; i < longUsers.length; i++) {
            positions[i] = longs[longUsers[i]];
        }
        return positions;
    }

    function globalStats()
        external
        view
        returns (uint256, uint256, uint256, uint256)
    {
        return (shortTokens, shortShares, longTokens, longShares);
    }

    /// ============================================================================================
    /// Funding Rate Engine
    /// ============================================================================================

    function shortFundings() external view returns (address[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < shortUsers.length; i++) {
            if (shorts[shortUsers[i]].funding <= block.timestamp) {
                count++;
            }
        }

        address[] memory positions = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < shortUsers.length; i++) {
            if (shorts[shortUsers[i]].funding <= block.timestamp) {
                positions[index] = shortUsers[i];
                index++;
            }
        }
        return positions;
    }

    function longFundings() external view returns (address[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < longUsers.length; i++) {
            if (longs[longUsers[i]].funding <= block.timestamp) {
                count++;
            }
        }

        address[] memory positions = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < longUsers.length; i++) {
            if (longs[longUsers[i]].funding <= block.timestamp) {
                positions[index] = longUsers[i];
                index++;
            }
        }
        return positions;
    }

    function fundingShortList(address[] calldata list) external {
        for (uint i = 0; i < list.length; i++) {
            this.shortFundRate(list[i]);
        }
    }

    function fundingLongList(address[] calldata list) external {
        for (uint i = 0; i < list.length; i++) {
            this.longFundRate(list[i]);
        }
    }

    /// ============================================================================================
    /// Liquidation Engine
    /// ============================================================================================

    function shortLiquidations() external view returns (address[] memory) {
        uint256 price = currentPrice();
        uint256 count = 0;

        for (uint256 i = 0; i < shortUsers.length; i++) {
            if (price >= shorts[shortUsers[i]].liquidation) {
                count++;
            }
        }

        address[] memory positions = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < shortUsers.length; i++) {
            if (price >= shorts[shortUsers[i]].liquidation) {
                positions[index] = shortUsers[i];
                index++;
            }
        }
        return positions;
    }

    function longLiquidations() external view returns (address[] memory) {
        uint256 price = currentPrice();
        uint256 count = 0;

        for (uint256 i = 0; i < longUsers.length; i++) {
            if (price <= longs[longUsers[i]].liquidation) {
                count++;
            }
        }

        address[] memory positions = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < longUsers.length; i++) {
            if (price <= longs[longUsers[i]].liquidation) {
                positions[index] = longUsers[i];
                index++;
            }
        }
        return positions;
    }

    /// ============================================================================================
    /// Testnet Simulation
    /// ============================================================================================

    function simulateShorts(
        address[] calldata users,
        uint256[] calldata margins,
        uint256[] calldata leverages
    ) external {
        onlyAdmin();
        for (uint256 i = 0; i < users.length; i++) {
            try
                this._simulateShortSingle(
                    msg.sender,
                    users[i],
                    margins[i],
                    leverages[i]
                )
            {} catch {
                continue;
            }
        }
    }

    function _simulateShortSingle(
        address sender,
        address user,
        uint256 margin,
        uint256 leverage
    ) external {
        usd.transferFrom(sender, address(this), margin);
        _shortOpen(user, margin, leverage);
    }

    function simulateLongs(
        address[] calldata users,
        uint256[] calldata margins,
        uint256[] calldata leverages
    ) external {
        onlyAdmin();
        for (uint256 i = 0; i < users.length; i++) {
            try
                this._simulateLongSingle(
                    msg.sender,
                    users[i],
                    margins[i],
                    leverages[i]
                )
            {} catch {
                continue;
            }
        }
    }

    function _simulateLongSingle(
        address sender,
        address user,
        uint256 margin,
        uint256 leverage
    ) external {
        usd.transferFrom(sender, address(this), margin);
        _longOpen(user, margin, leverage);
    }

    function closeShortList(address[] calldata list) external {
        onlyAdmin();
        for (uint256 i = 0; i < list.length; i++) {
            this.shortClose(list[i]);
        }
    }

    function closeLongList(address[] calldata list) external {
        onlyAdmin();
        for (uint256 i = 0; i < list.length; i++) {
            this.longClose(list[i]);
        }
    }

    /// ============================================================================================
    /// Private Functions
    /// ============================================================================================

    function onlyAdmin() private view {
        require(msg.sender == admin, NotAuthorized());
    }

    function onlyOwnerOrAdmin(address owner) private view {
        require(
            msg.sender == owner ||
                msg.sender == admin ||
                msg.sender == address(this),
            NotAuthorized()
        );
    }

    function shortActive(address user, bool active) private view {
        require(shorts[user].active == active, PositionActiveError());
    }

    function longActive(address user, bool active) private view {
        require(longs[user].active == active, PositionActiveError());
    }
}
