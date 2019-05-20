var networks = {
    // BCH = 0, BTC = 1, DASH = 2, ETC = 3, ETH = 4, LTC = 5.
    "BCH":{
        name: "BCH - Bitcoin Cash",
        ticker:"BCH",
        onSelect: function() {
            network = {
                messagePrefix: '\x18Bitcoin Signed Message:\n',
                bech32: 'bc',
                bip32: {
                  public: 0x0488b21e,
                  private: 0x0488ade4
                },
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80
            };            
        },
    },
    "BTC":{
        name: "BTC - Bitcoin",
        ticker:"BTC",
        onSelect: function() {
            network = {
                messagePrefix: '\x18Bitcoin Signed Message:\n',
                bech32: 'bc',
                bip32: {
                  public: 0x0488b21e,
                  private: 0x0488ade4
                },
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80
            };
        },
    },
    "DASH":{
        name: "DASH - Dash",
        ticker:"DASH",
        onSelect: function() {
            network = {
                messagePrefix: 'unused',
                bip32: {
                  public: 0x0488b21e,
                  private: 0x0488ade4
                },
                pubKeyHash: 0x4c,
                scriptHash: 0x10,
                wif: 0xcc
            };
        },
    },
    "ETC":{
        name: "ETC - Ethereum Classic",
        ticker:"ETC",
        segwitAvailable: false,
        onSelect: function() {
            network = {
                messagePrefix: '\x18Bitcoin Signed Message:\n',
                bech32: 'bc',
                bip32: {
                  public: 0x0488b21e,
                  private: 0x0488ade4
                },
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80
            };            
        },
    },
    "ETH":{
        name: "ETH - Ethereum",
        ticker:"ETH",
        onSelect: function() {
            network = {
                messagePrefix: '\x18Bitcoin Signed Message:\n',
                bech32: 'bc',
                bip32: {
                  public: 0x0488b21e,
                  private: 0x0488ade4
                },
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80
            };
        },
    },
    "LTC":{
        name: "LTC - Litecoin",
        ticker:"LTC",
        onSelect: function() {
            network = {
                messagePrefix: '\x19Litecoin Signed Message:\n',
                bip32: {
                  public: 0x0488b21e,
                  private: 0x0488ade4,
                },
                pubKeyHash: 0x30,
                scriptHash: 0x32,
                wif: 0xb0
            };
        },
    },
}

module.exports = networks;