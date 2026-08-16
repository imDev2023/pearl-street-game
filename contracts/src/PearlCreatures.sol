// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GameConstants as C} from "./GameConstants.sol";
import {IERC20Minimal} from "./ClamVault.sol";

/// Gen-0 creature NFT with the primary sale built in. Minimal ERC721 surface.
/// Sale proceeds split 30% to the season prize pool / 70% to operations, per purchase.
/// PROTOTYPE SIMPLIFICATION: species and sector derive deterministically from the token id
/// instead of commit-reveal; fine while stats carry no market value, must change for the
/// real mint (chain has no VRF; commit-reveal is the documented path).
contract PearlCreatures {
    string public constant name = "Pearl Street Creatures";
    string public constant symbol = "PEARL-C";
    uint8 public constant NUM_SPECIES = 5;
    uint8 public constant NUM_SECTORS = 8;

    IERC20Minimal public immutable clam;
    /// Set exactly once after deployment (the pool needs the game, the game needs this
    /// contract, so the pool cannot exist yet at construction). Sale is closed until set.
    address public prizePool;
    address public immutable opsTreasury;
    address public immutable ops;

    uint256 public totalMinted;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(address => uint256) public mintedBy;
    mapping(address => bool) public allowlisted;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Gen0Minted(address indexed buyer, uint256 indexed tokenId, uint256 price);

    constructor(IERC20Minimal clam_, address opsTreasury_) {
        require(opsTreasury_ != address(0), "zero address");
        clam = clam_;
        opsTreasury = opsTreasury_;
        ops = msg.sender;
    }

    function setPrizePool(address prizePool_) external {
        require(msg.sender == ops && prizePool == address(0), "pool set once");
        require(prizePool_ != address(0), "zero pool");
        prizePool = prizePool_;
    }

    function setAllowlisted(address[] calldata wallets, bool state) external {
        require(msg.sender == ops, "ops only");
        for (uint256 i = 0; i < wallets.length; i++) {
            allowlisted[wallets[i]] = state;
        }
    }

    function priceFor(address buyer) public view returns (uint256) {
        return allowlisted[buyer] ? C.GEN0_PRICE_ALLOWLIST : C.GEN0_PRICE_PUBLIC;
    }

    function buyGen0(uint256 count) external {
        require(prizePool != address(0), "sale not open");
        require(count > 0, "zero count");
        require(totalMinted + count <= C.GEN0_SUPPLY, "sold out");
        require(mintedBy[msg.sender] + count <= C.GEN0_PER_WALLET_CAP, "wallet cap");
        uint256 price = priceFor(msg.sender);
        uint256 total = price * count;
        uint256 toPool = (total * C.SALE_TO_POOL_BPS) / C.BPS;
        require(clam.transferFrom(msg.sender, prizePool, toPool), "pool transfer");
        require(clam.transferFrom(msg.sender, opsTreasury, total - toPool), "ops transfer");
        mintedBy[msg.sender] += count;
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = ++totalMinted;
            ownerOf[tokenId] = msg.sender;
            balanceOf[msg.sender] += 1;
            emit Transfer(address(0), msg.sender, tokenId);
            emit Gen0Minted(msg.sender, tokenId, price);
        }
    }

    /// Species 0-4 (octopus, shark, turtle, seahorse, pufferfish), fixed at mint.
    function speciesOf(uint256 tokenId) external view returns (uint8) {
        require(ownerOf[tokenId] != address(0), "no token");
        // casting to 'uint8' is safe because the value is mod NUM_SPECIES (5)
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint8(tokenId % NUM_SPECIES);
    }

    /// Sector affinity 0-7, mapping to feed sectors in the VoyageGame.
    function sectorOf(uint256 tokenId) public view returns (uint8) {
        require(ownerOf[tokenId] != address(0), "no token");
        return uint8(uint256(keccak256(abi.encodePacked(address(this), tokenId))) % NUM_SECTORS);
    }

    function approve(address to, uint256 tokenId) external {
        address holder = ownerOf[tokenId];
        require(msg.sender == holder || isApprovedForAll[holder][msg.sender], "not authorized");
        getApproved[tokenId] = to;
        emit Approval(holder, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        address holder = ownerOf[tokenId];
        require(holder == from, "wrong from");
        require(to != address(0), "zero to");
        require(
            msg.sender == holder || msg.sender == getApproved[tokenId]
                || isApprovedForAll[holder][msg.sender],
            "not authorized"
        );
        delete getApproved[tokenId];
        ownerOf[tokenId] = to;
        balanceOf[from] -= 1;
        balanceOf[to] += 1;
        emit Transfer(from, to, tokenId);
    }
}
