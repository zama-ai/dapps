// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "fhevm/lib/TFHE.sol";
import "./IdMapping.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title Diploma
 * @author ZAMA
 * @dev Contract for managing encrypted diploma records using TFHE encryption
 * @notice Allows universities to register encrypted diploma data and graduates to generate claims
 */
contract Diploma is SepoliaZamaFHEVMConfig, AccessControl {
    /// @dev Constants
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    /// @dev Custom errors
    /// @notice Thrown when attempting to register a diploma for a user who already has one
    error DiplomaAlreadyRegistered();
    /// @notice Thrown when attempting to access diploma data for a user who doesn't have one registered
    error DiplomaNotRegistered();
    /// @notice Thrown when sender doesn't have permission to access the encrypted data
    error AccessNotPermitted();
    /// @notice Thrown when claim generation fails, includes failure data
    /// @param data The error data returned from the failed claim generation
    error ClaimGenerationFailed(bytes data);

    /// @dev Structure to hold encrypted diploma data
    struct DiplomaData {
        euint128 id; // Encrypted unique diploma ID
        ebytes64 university; // Encrypted university identifier
        euint16 degree; // Encrypted degree identifier
        ebytes64 grade; // Encrypted grade
    }

    /// @dev Instance of IdMapping contract
    IdMapping private idMapping;

    /// @dev Mapping to store diploma records by user ID
    mapping(uint256 => DiplomaData) private diplomaRecords;
    /// @dev Mapping to track registered diplomas
    mapping(uint256 => bool) public registered;
    /// @dev Mapping for degree identifiers to degree names
    mapping(uint16 => string) public degreeTypes;

    /// @dev Event emitted when a diploma is registered
    event DiplomaRegistered(address indexed graduate);
    /// @dev Event emitted when a claim is generated
    event ClaimGenerated(address indexed graduate, address claimAddress, string claimFn);

    /**
     * @dev Constructor to initialize the contract with IdMapping address
     * @param _idMappingAddress Address of the IdMapping contract
     */
    constructor(address _idMappingAddress) {
        idMapping = IdMapping(_idMappingAddress);
        _grantRole(OWNER_ROLE, msg.sender); // Admin role for contract owner
        _grantRole(REGISTRAR_ROLE, msg.sender); // Registrar role for contract owner

        // Initialize degree mappings
        degreeTypes[1] = "Electrical Engineering (B.Eng)";
        degreeTypes[2] = "Mechanical Engineering (B.Eng)";
        degreeTypes[3] = "Computer Science (B.Sc)";
        degreeTypes[4] = "Civil Engineering (B.Eng)";
        degreeTypes[5] = "Chemical Engineering (B.Eng)";
        // Graduate degrees start from 1001
        degreeTypes[1001] = "Electrical Engineering (M.Eng)";
        degreeTypes[1002] = "Mechanical Engineering (M.Eng)";
        degreeTypes[1003] = "Computer Science (M.Sc)";
        // Doctoral degrees start from 2001
        degreeTypes[2001] = "Electrical Engineering (Ph.D)";
        degreeTypes[2002] = "Computer Science (Ph.D)";
    }

    /**
     * @dev Adds a new registrar address
     * @param registrar Address to be granted registrar role
     */
    function addRegistrar(address registrar) external onlyRole(OWNER_ROLE) {
        _grantRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @dev Removes a registrar address
     * @param registrar Address to be revoked registrar role
     */
    function removeRegistrar(address registrar) external onlyRole(OWNER_ROLE) {
        _revokeRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @dev Retrieves the degree type for a given degree ID
     * @param degreeId The ID of the degree type to retrieve
     * @return The name/description of the degree type
     */
    function getDegreeType(uint16 degreeId) public view returns (string memory) {
        return degreeTypes[degreeId];
    }

    /**
     * @dev Registers a new encrypted diploma for a user
     * @param userId ID of the user to register diploma for
     * @param university Encrypted university identifier
     * @param degree Encrypted degree type
     * @param grade Encrypted grade
     * @param inputProof Proof for encrypted inputs
     * @return bool indicating success
     */
    function registerDiploma(
        uint256 userId,
        einput university,
        einput degree,
        einput grade,
        bytes calldata inputProof
    ) public virtual onlyRole(REGISTRAR_ROLE) returns (bool) {
        if (registered[userId]) revert DiplomaAlreadyRegistered();

        // Generate a new encrypted diploma ID
        euint128 newId = TFHE.randEuint128();

        // Store the encrypted diploma data
        diplomaRecords[userId] = DiplomaData({
            id: newId,
            university: TFHE.asEbytes64(university, inputProof),
            degree: TFHE.asEuint16(degree, inputProof),
            grade: TFHE.asEbytes64(grade, inputProof)
        });

        registered[userId] = true; // Mark the diploma as registered

        // Get the address associated with the user ID
        address addressToBeAllowed = idMapping.getAddr(userId);

        // Allow the graduate to access their own data
        TFHE.allow(diplomaRecords[userId].id, addressToBeAllowed);
        TFHE.allow(diplomaRecords[userId].university, addressToBeAllowed);
        TFHE.allow(diplomaRecords[userId].degree, addressToBeAllowed);
        TFHE.allow(diplomaRecords[userId].grade, addressToBeAllowed);

        // Allow the contract to access the data
        TFHE.allowThis(diplomaRecords[userId].id);
        TFHE.allowThis(diplomaRecords[userId].university);
        TFHE.allowThis(diplomaRecords[userId].degree);
        TFHE.allowThis(diplomaRecords[userId].grade);

        emit DiplomaRegistered(addressToBeAllowed); // Emit event for diploma registration

        return true;
    }

    /**
     * @dev Retrieves encrypted university identifier for a user
     * @param userId ID of the user to get university for
     * @return euint8 Encrypted university identifier
     */
    function getMyUniversity(uint256 userId) public view virtual returns (ebytes64) {
        if (!registered[userId]) revert DiplomaNotRegistered();
        return diplomaRecords[userId].university;
    }

    /**
     * @dev Retrieves encrypted degree type for a user
     * @param userId ID of the user to get degree for
     * @return euint8 Encrypted degree type
     */
    function getMyDegree(uint256 userId) public view virtual returns (euint16) {
        if (!registered[userId]) revert DiplomaNotRegistered();
        return diplomaRecords[userId].degree;
    }

    /**
     * @dev Retrieves encrypted grade for a user
     * @param userId ID of the user to get grade for
     * @return euint8 Encrypted grade
     */
    function getMyGrade(uint256 userId) public view virtual returns (ebytes64) {
        if (!registered[userId]) revert DiplomaNotRegistered();
        return diplomaRecords[userId].grade;
    }

    /**
     * @dev Checks if a diploma is registered for a user
     * @param userId ID of the user to check
     * @return bool indicating if diploma exists
     */
    function hasDiploma(uint256 userId) public view virtual returns (bool) {
        return registered[userId];
    }

    /**
     * @dev Generates a claim for a diploma
     * @param claimAddress Address of the claim contract
     * @param claimFn Function signature to call on claim contract
     */
    function generateClaim(address claimAddress, string memory claimFn) public {
        /// @dev Only the msg.sender that is registered under the user ID can make the claim
        uint256 userId = idMapping.getId(msg.sender);

        /// @dev Grant temporary access for graduate's data to be used in claim generation
        TFHE.allowTransient(diplomaRecords[userId].degree, claimAddress);

        /// @dev Attempt the external call and capture the result
        (bool success, bytes memory data) = claimAddress.call(abi.encodeWithSignature(claimFn, userId));
        if (!success) revert ClaimGenerationFailed(data);

        emit ClaimGenerated(msg.sender, claimAddress, claimFn); /// @dev Emit event for claim generation
    }
}
