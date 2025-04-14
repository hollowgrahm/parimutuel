// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.28;

//    _______     __        _______    __     ___      ___  ____  ____  ___________  ____  ____   _______  ___
//   |   __ "\   /""\      /"      \  |" \   |"  \    /"  |("  _||_ " |("     _   ")("  _||_ " | /"     "||"  |
//   (. |__) :) /    \    |:        | ||  |   \   \  //   ||   (  ) : | )__/  \\__/ |   (  ) : |(: ______)||  |
//   |:  ____/ /' /\  \   |_____/   ) |:  |   /\\  \/.    |(:  |  | . )    \\_ /    (:  |  | . ) \/    |  |:  |
//   (|  /    //  __'  \   //      /  |.  |  |: \.        | \\ \__/ //     |.  |     \\ \__/ //  // ___)_  \  |___
//  /|__/ \  /   /  \\  \ |:  __   \  /\  |\ |.  \    /:  | /\\ __ //\     \:  |     /\\ __ //\ (:      "|( \_|:  \
// (_______)(___/    \___)|__|  \___)(__\_|_)|___|\__/|___|(__________)     \__|    (__________) \_______) \_______)

import {Math} from "./libraries/Math.sol";
import {PriceFeed} from "./interfaces/PriceFeed.sol";
import {IERC20} from "./interfaces/IERC20.sol";

contract Parimutuel {
    enum Side {
        SHORT,
        LONG
    }

    struct Position {
        // equity on margin pool maintaining the position
        uint256 marginShares;
        // size in base / settlement token
        uint256 tokens;
        // potential for share of profits
        uint256 shares;
        // actually realized share of profits
        uint256 activeShares;
        // price at which the position was opened
        uint256 entry;
        // existence of the position
        bool active;
    }

    struct Market {
        // sum of 'margin' deposits for all positions on the side
        uint256 marginPool;
        // sum of 'marginShares' for all positions on the side
        uint256 marginShares;
        // sum of 'tokens' for all positions on the side
        uint256 tokens;
        // sum of 'shares' for all positions on the side
        uint256 shares;
        // sum of 'activeShares' for all positions on the side
        uint256 activeShares;
        // leverage fees, realized losses, and liquidations paid from the other side.
        // Positions can be closed to claim a share of profits, proportional to their 'activeShares'
        uint256 profits;
    }

    error PositionAlreadyActive();
    error PositionNotActive();
    error PositionNotLiquidatable();
    error InvalidLeverage();
    error InvalidSide();
    error NotAuthorized();
    error FundingRateNotDue();
    error LeverageFeeExceedsMargin();

    event PositionOpened(
        address indexed user,
        uint256 margin,
        uint256 leverage,
        Side side
    );
    event PositionClosed(
        address indexed user,
        uint256 margin,
        uint256 amountOut,
        Side side
    );
    event MarginAdded(address indexed user, uint256 amount, Side side);
    event FundingPaid(uint256 fundingFee, uint256 nextFunding, Side side);

    uint256 internal constant MIN_LEVERAGE = 1 * PRECISION;
    uint256 internal constant MAX_LEVERAGE = 100 * PRECISION;
    uint256 internal constant PRECISION = 10 ** 8;
    uint256 internal constant FUNDING_INTERVAL = 15 minutes;
    uint256 internal constant FUNDING_PERIODS = 96;
    uint256 internal constant MAX_DAILY_FUNDING_RATE = 1 * PRECISION;
    uint256 internal constant BIPS_BASIS = 10000;
    uint256 internal constant PROFIT_FEE_BIPS = 200;
    uint256 internal constant FUNDING_FEE_BIPS = 200;

    address internal feeCollector;
    uint256 internal fundingDue;
    PriceFeed internal oracle;
    IERC20 internal settlementToken;

    mapping(address => mapping(Side => Position)) internal positions;
    mapping(Side => Market) internal market;

    constructor(address _settlementToken, address _oracle) {
        feeCollector = msg.sender;
        settlementToken = IERC20(_settlementToken);
        oracle = PriceFeed(_oracle);
    }

    function open(
        address user,
        uint256 margin,
        uint256 tokens,
        Side side
    ) internal {
        require(!_positionExists(user, side), PositionAlreadyActive());

        settlementToken.transferFrom(msg.sender, address(this), margin);

        uint256 _shares = Math.sqrt(tokens + market[side].tokens) -
            Math.sqrt(market[side].tokens);
        uint256 _entry = currentPrice();
        uint256 _leverageFee;

        if (market[side].tokens != 0) {
            _leverageFee = (tokens * _shares) / market[side].shares;
            require(_leverageFee < margin, LeverageFeeExceedsMargin());
        }

        uint256 _margin = margin - _leverageFee;
        uint256 _marginShares = market[side].marginPool == 0
            ? _margin
            : (_margin * market[side].marginShares) / market[side].marginPool;
        uint256 leverage = (tokens * PRECISION) / _margin;
        require(
            leverage >= MIN_LEVERAGE && leverage <= MAX_LEVERAGE,
            InvalidLeverage()
        );
        uint256 _activeShares = leverage == MIN_LEVERAGE ? _shares : 0;

        market[side].marginPool += _margin;
        market[side].marginShares += _marginShares;
        market[side].tokens += tokens;
        market[side].shares += _shares;
        market[side].activeShares += _activeShares;
        market[side].profits += _leverageFee;

        positions[user][side] = Position({
            marginShares: _marginShares,
            tokens: tokens,
            shares: _shares,
            activeShares: _activeShares,
            entry: _entry,
            active: true
        });

        emit PositionOpened(user, margin, leverage, side);
    }

    function liquidate(address user, Side side) external {
        require(_positionExists(user, side), PositionNotActive());

        Position storage pos = positions[user][side];
        uint256 price = currentPrice();
        uint256 liquidation = _liqCalc(pos, side);

        if (side == Side.SHORT) {
            // user liquidated
            require(price >= liquidation, PositionNotLiquidatable());
        } else if (side == Side.LONG) {
            // user liquidated
            require(price <= liquidation, PositionNotLiquidatable());
        } else {
            revert InvalidSide();
        }
        _close(user, side);
    }

    function close(Side side) external {
        _close(msg.sender, side);
    }

    function _close(address user, Side side) internal {
        require(_positionExists(user, side), PositionNotActive());

        Position storage pos = positions[user][side];
        uint256 price = currentPrice();
        uint256 liquidation = _liqCalc(pos, side);
        uint256 marginShareValue = _marginCalc(pos, side);

        _positionUpdate(pos, side);

        uint256 shareProfits = (market[side].profits * pos.activeShares) /
            market[side].activeShares;
        uint256 netShareProfit = (shareProfits *
            (BIPS_BASIS - PROFIT_FEE_BIPS)) / BIPS_BASIS;
        uint256 profitFee = shareProfits - netShareProfit;
        uint256 transferToUser;

        if (side == Side.SHORT) {
            // user liquidated
            if (price >= liquidation) {
                transferToUser = 0;
                market[Side.LONG].profits += marginShareValue;
                // user has losses
            } else if (price >= pos.entry) {
                uint256 marginValue = (marginShareValue *
                    (liquidation - price)) / (liquidation - pos.entry);
                uint256 loss = marginShareValue - marginValue;
                market[_getOtherSide(side)].profits += loss;
                transferToUser = marginValue;
                // user in profit
            } else if (price < pos.entry) {
                transferToUser = marginShareValue + netShareProfit;
                market[side].profits -= shareProfits;
            }
        } else if (side == Side.LONG) {
            // user liquidated
            if (price <= liquidation) {
                transferToUser = 0;
                market[Side.SHORT].profits += marginShareValue;
                // user has losses
            } else if (price <= pos.entry) {
                uint256 marginValue = (marginShareValue *
                    (price - liquidation)) / (pos.entry - liquidation);
                uint256 loss = marginShareValue - marginValue;
                market[_getOtherSide(side)].profits += loss;
                transferToUser = marginValue;
                // user in profit
            } else if (price > pos.entry) {
                transferToUser = marginShareValue + netShareProfit;
                market[side].profits -= shareProfits;
            }
        } else {
            revert InvalidSide();
        }

        market[side].marginPool -= marginShareValue;
        market[side].marginShares -= pos.marginShares;
        market[side].tokens -= pos.tokens;
        market[side].shares -= pos.shares;
        market[side].activeShares -= pos.activeShares;
        emit PositionClosed(user, marginShareValue, transferToUser, side);
        delete positions[user][side];

        settlementToken.transfer(user, transferToUser);
        settlementToken.transfer(feeCollector, profitFee);
    }

    function addMargin(address user, uint256 amount, Side side) external {
        require(_positionExists(user, side), PositionNotActive());

        settlementToken.transferFrom(msg.sender, address(this), amount);
        market[side].marginPool += amount;

        Position storage pos = positions[user][side];
        uint256 additionalShares = (amount * market[side].marginShares) /
            market[side].marginPool;
        market[side].marginShares += additionalShares;
        pos.marginShares += additionalShares;

        uint256 marginShareValue = _marginCalc(pos, side);
        uint256 leverage = (pos.tokens * PRECISION) / marginShareValue;
        require(
            leverage >= MIN_LEVERAGE && leverage <= MAX_LEVERAGE,
            InvalidLeverage()
        );

        _positionUpdate(pos, side);

        emit MarginAdded(user, amount, side);
    }

    function triggerFunding() public {
        require(block.timestamp >= fundingDue, FundingRateNotDue());

        uint256 shortTokens = market[Side.SHORT].tokens;
        uint256 longTokens = market[Side.LONG].tokens;
        Side side = (shortTokens > longTokens) ? Side.SHORT : Side.LONG;
        uint256 otherSideShares = market[_getOtherSide(side)].shares;

        // avoid paying when no position is on the other side (avoids divide-by-zero errors)
        if (otherSideShares != 0) {
            uint256 sideTokens = market[side].tokens;
            uint256 otherSideTokens = market[_getOtherSide(side)].tokens;

            uint256 totalTokens = sideTokens + otherSideTokens;
            uint256 difference = sideTokens - otherSideTokens;
            uint256 funding = (market[side].marginPool *
                difference *
                MAX_DAILY_FUNDING_RATE) /
                (totalTokens * FUNDING_PERIODS * PRECISION);

            uint256 netFunding = (funding * (BIPS_BASIS - FUNDING_FEE_BIPS)) /
                BIPS_BASIS;
            uint256 fundingFee = funding - netFunding;

            market[side].marginPool -= funding;
            market[_getOtherSide(side)].marginPool += netFunding;
            fundingDue += FUNDING_INTERVAL;
            emit FundingPaid(funding, fundingDue, side);

            settlementToken.transfer(feeCollector, fundingFee);
        }
    }

    function _positionUpdate(Position storage pos, Side side) internal {
        uint256 startingActiveShares = pos.activeShares;
        uint256 price = currentPrice();
        uint256 marginShareValue = _marginCalc(pos, side);
        uint256 _activeShares;

        if (side == Side.SHORT) {
            uint256 profit = pos.entry -
                ((pos.entry * marginShareValue) / pos.tokens);
            if (price <= profit) {
                _activeShares = pos.shares;
            } else if (price >= pos.entry) {
                _activeShares = 0;
            } else {
                uint256 numerator = price - profit;
                uint256 denominator = pos.entry - profit;
                _activeShares = (pos.shares * numerator) / denominator;
            }
        } else if (side == Side.LONG) {
            uint256 profit = pos.entry +
                ((pos.entry * marginShareValue) / pos.tokens);
            if (price >= profit) {
                _activeShares = pos.shares;
            } else if (price <= pos.entry) {
                _activeShares = 0;
            } else {
                uint256 numerator = price - pos.entry;
                uint256 denominator = profit - pos.entry;
                _activeShares = (pos.shares * numerator) / denominator;
            }
        } else {
            revert InvalidSide();
        }

        pos.activeShares = _activeShares;
        market[side].activeShares =
            market[side].activeShares +
            _activeShares -
            startingActiveShares;
    }

    function _getOtherSide(Side side) internal pure returns (Side) {
        if (side == Side.SHORT) {
            return Side.LONG;
        } else if (side == Side.LONG) {
            return Side.SHORT;
        } else {
            revert InvalidSide();
        }
    }

    function _positionExists(
        address user,
        Side side
    ) internal view returns (bool) {
        return positions[user][side].active;
    }

    function _marginCalc(
        Position storage pos,
        Side side
    ) internal view returns (uint256 marginValue) {
        return
            (market[side].marginPool * pos.marginShares) /
            market[side].marginShares;
    }

    function _liqCalc(
        Position storage pos,
        Side side
    ) internal view returns (uint256 liquidation) {
        uint256 marginValue = _marginCalc(pos, side);

        if (side == Side.SHORT) {
            return pos.entry + ((pos.entry * marginValue) / pos.tokens);
        } else if (side == Side.LONG) {
            return pos.entry - ((pos.entry * marginValue) / pos.tokens);
        } else {
            revert InvalidSide();
        }
    }

    function currentPrice() public view returns (uint256) {
        (, int256 _price, , , ) = oracle.latestRoundData();
        if (_price < 0) _price = 0;
        return uint256(_price);
    }
}
