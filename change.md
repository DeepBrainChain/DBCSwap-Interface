# Chain ID 和环境
19850818 -> 19880818
testnet -> mainnet

# RPC URL
https://rpc-testnet.dbcwallet.io -> https://rpc.dbcwallet.io

# Contract Addresses
REACT_APP_ROUTER_ADDRESS:
0xa9FE8eBDc579beE77155A34AF5e46cDfFf43981B -> 0x615b6bb562565224E2b810Dc0277ed0777e149E8

REACT_APP_WDBC_ADDRESS:
0x85B24b3517E3aC7bf72a14516160541A60cFF19d -> 0xD7EA4Da7794c7d09bceab4A21a6910D9114Bc936

REACT_APP_FACTORY_ADDRESS:
0xAc2366109dA0B0aFd28ecC2d2FE171c78594d113 -> 0x34A7E09D8810d2d8620700f82b471879223F1628

REACT_APP_MULTICALL_ADDRESS:
0xE92da0910B224055776E20a61c238C3a3fd2d42c -> 0xB6De1eDDC64aEFBCCf8B910d320ab03585E7a0a2

REACT_APP_POSITION_MANAGER_ADDRESS:
0xdc8748C1e8d93aBE88B7B77AED4fEb0bAb4fACCE -> 0xfCE792dd602fA70143e43e7556e8a92D762bA9FC

REACT_APP_MIGRATOR_ADDRESS:
0x90d2eE2Ec1fF7803d2b072C83f033E523f3a02B6 -> 0xF89F7E6526074C977cD40f7566fA29eF16DbcA4b

REACT_APP_QUOTER_V2_ADDRESS:
0xA56C023F150F5Bd69ebB1fF8E59d2894DD6138F1 -> 0xE9d6828536807721317754a13F1624AA8164b2Be

# 需要新增的地址
需要添加以下配置（这些在 local 中标注为"没搜到"的）：
REACT_APP_SWAP_ROUTER_02_ADDRESS=0x88Aff97710EbC031396bBAa8d09a27Da0727B323
REACT_APP_DESCRIPTOR_PROXY_ADDRESS=0xBEE41e5901b071dC2c4458cd80fA5b9087D37bd9
REACT_APP_NFT_DESCRIPTOR_ADDRESS=0x59f6816b99Cb6761AE4ac404C8100216697608e0
REACT_APP_TICK_LENS_ADDRESS=0xf3841258DA96475d91c42a5FFdE5B58E9156fE9E
REACT_APP_PROXY_ADMIN_ADDRESS=0xDd01f7085c7367f7FECB0F25013C065B239e81D3

# 保持不变的地址
REACT_APP_PERMIT2_ADDRESS 保持不变：0x000000000022D473030F116dDEE9F6B43aC78BA3
REACT_APP_DGC_TOKEN_ADDRESS 保持不变：0xC260ed583545d036ed99AA5C76583a99B7E85D26
REACT_APP_SIC_TOKEN_ADDRESS 保持不变：0xC260ed583545d036ed99AA5C76583a99B7E85D26
REACT_APP_TOKEN_LIST_URL 保持不变："https://test.dbcswap.io/config/config/token-list.json"










Frank给的：
WDBC address: 0xD7EA4Da7794c7d09bceab4A21a6910D9114Bc936
Permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3
UniversalRouter: 0x615b6bb562565224E2b810Dc0277ed0777e149E8
{
  "v3CoreFactoryAddress": "0x34A7E09D8810d2d8620700f82b471879223F1628",
  "multicall2Address": "0xB6De1eDDC64aEFBCCf8B910d320ab03585E7a0a2",
  "proxyAdminAddress": "0xDd01f7085c7367f7FECB0F25013C065B239e81D3",
  "tickLensAddress": "0xf3841258DA96475d91c42a5FFdE5B58E9156fE9E",
  "nftDescriptorLibraryAddressV1_3_0": "0x538C4060Be0967Bd54D1B48294d7B5Af9317343b",
  "nonfungibleTokenPositionDescriptorAddressV1_3_0": "0x59f6816b99Cb6761AE4ac404C8100216697608e0",
  "descriptorProxyAddress": "0xBEE41e5901b071dC2c4458cd80fA5b9087D37bd9",
  "nonfungibleTokenPositionManagerAddress": "0xfCE792dd602fA70143e43e7556e8a92D762bA9FC",
  "v3MigratorAddress": "0xF89F7E6526074C977cD40f7566fA29eF16DbcA4b",
  "v3StakerAddress": "0x23B7452314cd892Ec797effC28aA4Ed6aDFB2D0A",
  "quoterV2Address": "0xE9d6828536807721317754a13F1624AA8164b2Be",
  "swapRouter02": "0x88Aff97710EbC031396bBAa8d09a27Da0727B323"
}

之前给的测试网的（不一定准备，后面有修改）：
{
    "v3CoreFactoryAddress":"0xAc2366109dA0B0aFd28ecC2d2FE171c78594d113","multicall2Address":"0xE92da0910B224055776E20a61c238C3a3fd2d42c","proxyAdminAddress":"0xAaffa0Ab0419BE44B838ccCE64e2884283BF5e4F","tickLensAddress":"0xb2402c70eF790435b71b169825A714434d8E4c71","nftDescriptorLibraryAddressV1_3_0":"0x2C528C1985cfed7918cC15854B08934197Fd64DC","nonfungibleTokenPositionDescriptorAddressV1_3_0":"0x829D068ac6c8D229abb87FAE0528d6A8CCcE8E88","descriptorProxyAddress":"0x15cdaFBBE654CAc11622aa83cDCb38542357A7b3","nonfungibleTokenPositionManagerAddress":"0xdc8748C1e8d93aBE88B7B77AED4fEb0bAb4fACCE","v3MigratorAddress":"0x90d2eE2Ec1fF7803d2b072C83f033E523f3a02B6","v3StakerAddress":"0x349762bdF5C1444FFE6A2228f1A488b69EE897D0","quoterV2Address":"0xA56C023F150F5Bd69ebB1fF8E59d2894DD6138F1","swapRouter02":"0x0348B9867862Aa638df274F0F861a677E0462Ea1"
    }