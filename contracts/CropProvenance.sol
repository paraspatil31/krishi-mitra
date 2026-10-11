// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CropProvenance
 * @notice Immutable farm-gate provenance ledger for KrishiBazaar.
 * Records harvest date, farmer ID, and certified quality tags on Polygon Amoy (PoS).
 */
contract CropProvenance {
    address public owner;

    struct ProvenanceRecord {
        string listingId;
        string farmerId;
        string cropName;
        uint256 harvestTimestamp;
        string qualityGrade;
        string originDistrict;
        uint256 recordedAt;
        uint256 blockNumber;
    }

    // listingId => ProvenanceRecord
    mapping(string => ProvenanceRecord) private records;
    mapping(string => bool) private exists;

    // Indexed event for decentralized block explorer indexing
    event ProvenanceRecorded(
        string indexed listingId,
        string indexed farmerId,
        string cropName,
        uint256 harvestTimestamp,
        string qualityGrade,
        uint256 blockNumber
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can execute");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Records an immutable farm-gate harvest certificate.
     * @param listingId Unique identifier of produce listing in marketplace
     * @param farmerId Account ID of the certified farmer
     * @param cropName Commodity name (e.g., Tomato, Nashik Red Onion)
     * @param harvestTimestamp Unix timestamp when crop was harvested
     * @param qualityGrade Farm gate quality tag (A, B, or Organic)
     * @param originDistrict Geographical origin district in Maharashtra
     */
    function recordProvenance(
        string calldata listingId,
        string calldata farmerId,
        string calldata cropName,
        uint256 harvestTimestamp,
        string calldata qualityGrade,
        string calldata originDistrict
    ) external {
        require(bytes(listingId).length > 0, "listingId cannot be empty");
        require(!exists[listingId], "Provenance record already exists for listing");

        records[listingId] = ProvenanceRecord({
            listingId: listingId,
            farmerId: farmerId,
            cropName: cropName,
            harvestTimestamp: harvestTimestamp,
            qualityGrade: qualityGrade,
            originDistrict: originDistrict,
            recordedAt: block.timestamp,
            blockNumber: block.number
        });

        exists[listingId] = true;

        emit ProvenanceRecorded(
            listingId,
            farmerId,
            cropName,
            harvestTimestamp,
            qualityGrade,
            block.number
        );
    }

    /**
     * @notice Queries the immutable provenance record for a given listingId.
     */
    function getProvenance(string calldata listingId)
        external
        view
        returns (ProvenanceRecord memory)
    {
        require(exists[listingId], "Listing provenance record not found");
        return records[listingId];
    }

    /**
     * @notice Checks if a listing has been certified on-chain.
     */
    function hasProvenance(string calldata listingId) external view returns (bool) {
        return exists[listingId];
    }
}
