# Decentralized Identity

**How it works**

1. **Identity Management**: The system consists of four main contracts:
   - `IdMapping`: Maps user addresses to unique IDs for identity tracking
   - `PassportID`: Stores encrypted passport/identity data like name, birthdate
   - `Diploma`: Manages encrypted educational credentials and degrees
   - `EmployerClaim`: Generates verifiable claims about age and education

2. **Identity Registration**:
   - Users first get a unique ID from `IdMapping` via `generateId()`
   - Authorized registrars can register encrypted passport data using `PassportID.registerIdentity()`
   - Educational institutions can register encrypted diploma data via `Diploma.registerDiploma()`

3. **Encrypted Data Storage**: All sensitive data is stored encrypted using FHE:
   - Names, birthdates, and biometric data in `PassportID`
   - University, degree type, and grades in `Diploma`
   - Access controlled through TFHE permissions

4. **Claim Generation**:
   - Users can generate verifiable claims about their identity/credentials
   - `EmployerClaim` supports two types of claims:
     - Adult verification (18+ age check)
     - Degree verification (specific degree requirements)
   - Claims preserve privacy by using encrypted comparisons

5. **Verification Process**:
   - Claims are generated as encrypted boolean results
   - Employers can verify claims without seeing actual data
   - Combined verification checks both age and education requirements
   - Results stored as encrypted verification status

The system leverages FHE operations to enable privacy-preserving identity and credential verification without exposing sensitive personal data.
