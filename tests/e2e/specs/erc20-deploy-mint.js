describe('Erc20 Deploy / Mint / Transfer', () => {
  before(() => {
    cy.visit('http://localhost:8000/erc20');
  });

  it('should connect wallet with success', () => {
    cy.get('.Title__right > button').click();
    cy.acceptMetamaskAccess();
    cy.get('.Title__right > .Connect__account')
    .should('have.text', 'Connected with 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
  });

  it('should deploy erc20 contract with success', () => {
    cy.get('#contractAddress').type("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    cy.get('.ContractAddress__actions > button').click();
  });

  it('should getbalance with success', () => {
    // Check current Balance value
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)')
    .should('have.text', '- NARA');
    // Click Get Balance
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > button')
    .click();
    cy.confirmMetamaskDataSignatureRequest();
    // Check Balance value
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)')
      .invoke('text')
      .should('match', /^\d+ NARA$/);
  });

  it('should mint 1000 tokens and refresh Balance with success', () => {
    // Click Mint Tokens
    cy.get('.Token > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1)')
    .click();
    cy.confirmMetamaskPermissionToSpend();
    // Click Ok    // Check and Close Modal
    cy.get('#mint_dialog > div:nth-child(3) > div > div:nth-child(1)', {timeout: 50000})
    .should('have.text', 'The contract has been minted!');
    cy.get('#mint_dialog > div:nth-child(3) > div > div:nth-child(2)>button')
    .click();
    // Check new Balance
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > button')
    .click();
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)')
      .invoke('text')
      .should('match', /^[1-9]\d+ NARA$/);
  });

  it('should transfer tokens with success', () => {
    // Fill Address
    cy.get('#address').type("0xa5e1defb98efe38ebb2d958cee052410247f4c80");
    // Fill Amount
    cy.get('#amount').type("42");
    // Click Transfer
    cy.get('.Token > div:nth-child(2) > div > div:nth-child(3) > button').click();
    cy.confirmMetamaskPermissionToSpend();
    // Check and Close Modal
    cy.get('#transfer_dialog > div:nth-child(3) > div > div:nth-child(1)', {timeout: 50000})
    .should('have.text', 'The transfer has been done!');
    cy.get('#transfer_dialog > div:nth-child(3) > div > div:nth-child(2)>button')
    .click();
    // Refresh Balance
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > button')
    .click();
    cy.get('.Token > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)')
      .invoke('text')
      .should('match', /^[1-9]\d+ NARA$/);
  });

});
