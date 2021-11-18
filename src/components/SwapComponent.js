import * as React from "react";
import { Row, Col } from 'react-grid-system';
import '../css/SwapComponent.css';
import swapBtnImage from '../images/swapBtn.png';
import klearImage from '../images/logo.png';
import bnbImage from '../images/bnb-logo.png';
import busdImage from '../images/busd-logo.png';
import neonImage0 from '../images/neon/1.png';
import neonImage1 from '../images/neon/12.png';
import neonImage2 from '../images/neon/32.png';
import neonImage3 from '../images/neon/6.png';
import neonImage4 from '../images/neon/38.png';
import neonImage5 from '../images/neon/22.png';
import neonImage6 from '../images/neon/27.png';
import neonImage7 from '../images/neon/66.png';
import neonImage8 from '../images/neon/65.png';
import neonImage9 from '../images/neon/64.png';
import arrowDown from '../images/arrow-down.png';
import TradeContext from '../context/TradeContext';
import { addressSet } from '../constant/addressSet';
import {
    pancakeRouterABI, routerAddress,
    pancakePairABI, tokenABI
} from '../constant/contractABI';

import PropTypes from 'prop-types';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemText from '@material-ui/core/ListItemText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';

var token_list = [
    ['BNB', 'BUSD'],
    ['KLEAR']
];

var fromToLabel = ['From', 'To'];

var dialogOrder = 0;

function TokenListDialog(props) {
    const { onClose, selectedValue, open } = props;
    const [ bnbBalance, setBnbBalance ] = React.useState(0);
    const [ busdBalance, setBusdBalance ] = React.useState(0);
    const [ klearBalance, setKlearBalance ] = React.useState(0);

    const { walletAddress } = React.useContext(TradeContext);

    const handleClose = () => {
        onClose(selectedValue);
    };

    const handleListItemClick = (value) => {
        onClose(value);
    };

    React.useEffect(async () => {
        if (walletAddress) {
            let balance = 0;    
            balance = await props.getBalance('BNB');
            setBnbBalance(balance);
            balance = await props.getBalance('BUSD');
            setBusdBalance(balance);
            balance = await props.getBalance('KLEAR');
            setKlearBalance(balance);
        }
    }, [walletAddress])

    const DialogListItem = (token_name) => {
        return (
            <ListItem button onClick={() => handleListItemClick(token_name)} key={token_name}>
                <ListItemAvatar>
                    {token_name == "BNB" && (
                        <img className="swap-token-image" src={bnbImage} alt="bnbImage" />
                    )}
                    {token_name == "BUSD" && (
                        <img className="swap-token-image" src={busdImage} alt="busdImage" />
                    )}
                    {token_name == "KLEAR" && (
                        <img className="swap-token-image" src={klearImage} alt="klearImage" />
                    )}
                </ListItemAvatar>

                <ListItemText primary={token_name} />

                {token_name == "BNB" && bnbBalance != 0 && (<div>{bnbBalance.toFixed(6)}</div>)}
                {token_name == "BUSD" && bnbBalance != 0 && (<div>{busdBalance.toFixed(6)}</div>)}
                {token_name == "KLEAR" && bnbBalance != 0 && (<div>{klearBalance.toFixed(6)}</div>)}
            </ListItem>
        );
    }

    return (
        <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" className="tokenList-dialog" open={open}>
            <DialogTitle id="simple-dialog-title">Select a token</DialogTitle>
            <List>
                {token_list[dialogOrder].map((token_name) => (
                    DialogListItem(token_name)
                ))}

            </List>
        </Dialog>
    );
}

TokenListDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    selectedValue: PropTypes.string.isRequired,
};

function SwapComponent(props) {
    const [open, setOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(token_list[0][0]);

    const [balanceValue, setBalanceValue] = React.useState([0, 0]);
    const [token_names, setToken_names] = React.useState(["BNB", "KLEAR"]);
    const [amountValue, setAmountValue] = React.useState(["", ""]);
    const [approved, setApproved] = React.useState(true);

    const [rate, setRate] = React.useState(0);
    const { walletAddress, web3Instance, openTransak } = React.useContext(TradeContext);
    const amountMax = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    const getContractInstance = (contractABI, contractAddress) => {
        if (web3Instance) {
            let contract = new web3Instance.eth.Contract(contractABI, contractAddress);
            return contract;
        }
        else {
            return null;
        }
    }

    const checkApproval = async (token_name) => {
        let contractTokenInstance = getContractInstance(tokenABI, addressSet[token_name]);
        console.log(addressSet[token_name]);
        let allowance = await getAllowance(contractTokenInstance);
        if (allowance == 0) return false;
        else return true;
    }

    const handleClickOpen = (num) => {
        dialogOrder = num;
        setSelectedValue(token_names[num]);
        setOpen(true);
    };

    const handleClose = async (value) => {
        setOpen(false);
        setSelectedValue(value);
        let balance = await getBalance(value);
        let token_list = token_names;
        
        if (dialogOrder) {
            token_list = [token_names[0], value];
        } else {
            token_list = [value, token_names[1]];
        }

        setToken_names(token_list);

        if (dialogOrder == 0) setBalanceValue([balance, balanceValue[1]]);
        else setBalanceValue([balanceValue[0], balance]);
        await setRateFunction(token_list);

        if (token_list[0] != "BNB") {
            let flag = await checkApproval(token_list[0]);
            setApproved(flag);
        } else {
            setApproved(true);
        }
    };

    const getBalance = async (token_name) => {
        let balance = 0;
        let decimals = 18;
        if (!web3Instance) return 0;
        if (token_name == 'BNB') {
            await web3Instance.eth.getBalance(walletAddress)
                .then((result) => {
                    balance = result / Math.pow(10, decimals);
                })
        } else {
            let contractAddress = addressSet[token_name];
            let contractInstance = getContractInstance(tokenABI, contractAddress);

            await contractInstance.methods.decimals().call()
                .then((result) => {
                    decimals = result;
                })
                .catch((err) => {
                    console.log('decimal balance err');
                });

            await contractInstance.methods.balanceOf(walletAddress).call()
                .then((result) => {
                    balance = result / Math.pow(10, decimals);
                })
                .catch((err) => {
                    console.log('token balance err---');
                });
        }
        return balance;
    }

    const getPairAddress = (token_list) => {
        let pairAddress = "";
        if ((token_list[0] != "BNB") && (token_list[1] != "BNB")) {
            pairAddress = addressSet.busdKlear;
        } else if (token_list[0] == "KLEAR" || token_list[1] == "KLEAR") {
            pairAddress = addressSet.bnbKlear;
        } else {
            pairAddress = addressSet.bnbBusd;
        }
        return pairAddress;
    }

    const getRateFromTokenPair = async (token_list) => {
        let rateTemp = 1;
        let token0_address = addressSet[token_list[0]];
        let token1_address = addressSet[token_list[1]];
        let contractToken0Instance =  getContractInstance(tokenABI, token0_address);
        let contractToken1Instance = getContractInstance(tokenABI, token1_address);

        if (web3Instance) {
            let decimal0 = 0, decimal1 = 0;
            await contractToken0Instance.methods.decimals().call()
                .then((result) => {
                    decimal0 = result;
                })
                .catch((err) => {
                    console.log('decimal balance err');
                });
            await contractToken1Instance.methods.decimals().call()
                .then((result) => {
                    decimal1 = result;
                })
                .catch((err) => {
                    console.log('decimal balance err');
                });
            
            let pairAddress = getPairAddress(token_list);
            console.log("pairAddress", token_list, pairAddress);
            let contractPairInstance = getContractInstance(pancakePairABI, pairAddress);
            await contractPairInstance.methods.getReserves().call()
                .then((result) => {
                    if (token0_address < token1_address) {
                        rateTemp = result[1] / result[0] * Math.pow(10, decimal0 - decimal1);
                    } else {
                        rateTemp = result[0] / result[1] * Math.pow(10, decimal1 - decimal0);
                    }
                })
                .catch((err) => {
                    console.log('getReserveErr', err);
                });
            return rateTemp;
        } else {
            return 0;
        }
    }

    const setRateFunction = async (token_list) => {
        let rateTemp = 1;
        
        if (web3Instance) {
            if ((token_list[0] == "BNB") || (token_list[1] == "BNB")) {
                rateTemp = await getRateFromTokenPair(token_list);
            } else if (token_list[0] == "BUSD") {
                let rate1 = await getRateFromTokenPair(["BUSD", "BNB"]);
                let rate2 = await getRateFromTokenPair(["BNB", "KLEAR"]);
                rateTemp = rate1 * rate2;
            } else {
                let rate1 = await getRateFromTokenPair(["KLEAR", "BNB"]);
                let rate2 = await getRateFromTokenPair(["BNB", "BUSD"]);
                rateTemp = rate1 * rate2;
            }
            setRate(rateTemp);
        } else {
            return 0;
        }
    }

    const handleChangeInput = (e, order) => {
        let amount = e.target.value;
        if (walletAddress == "") {
            if (order == 0) setAmountValue([amount, amountValue[1]]);
            else setAmountValue([amountValue[0], amount])
        } else {
            if (order == 0) setAmountValue([amount, amount * rate]);
            else if (rate !== 0) setAmountValue([amount / rate, amount]);
            else setAmountValue([amountValue[0], amount]); 
        }

        if (amount == 0) {
            if (order == 0) setAmountValue(["", amountValue[1]]);
            else setAmountValue([amountValue[0], ""]);
        }
    }

    const handleMax = () => {
        setAmountValue([balanceValue[0], balanceValue[0] * rate]);
    }

    const getAllowance = async (contractTokenInstance) => {
        let allowance = 0;
        if (contractTokenInstance) {
            await contractTokenInstance.methods.allowance(walletAddress, routerAddress).call()
            .then((result) => {
                allowance = result;
            })
            .catch((err) => {
                console.log('allowance err');
            });
        }
        return allowance;
    }
    
    const approveFunction = async (contractTokenInstance) => {
        try {
            await contractTokenInstance.methods.approve(
                routerAddress,
                amountMax
            ).send({ from: walletAddress });
        } catch (error) {
            console.log(error)
        }
    }

    const getAmountOut = (amountIn, reserveIn, reserveOut) => {
        let amountInWithFee = amountIn * 998;
        let numerator = amountInWithFee * reserveOut;
        let denominator = reserveIn * 1000 + amountInWithFee;
        let amountOut = numerator / denominator;
        return amountOut;
    }

    const getAmountOutMin = async (amountIn, path) => {
        console.log(amountIn, path);
        let amount0 = amountIn, amount1 = 0;
        let reserveIn = 0, reserveOut = 0;
        for (let i = 0; i < path.length - 1; i++) {
            let pairAddress = getPairAddress([path[i], path[i + 1]]);
            let contractPairInstance = getContractInstance(pancakePairABI, pairAddress);
            await contractPairInstance.methods.getReserves().call()
                .then((result) => {
                    if (addressSet[path[i]] < addressSet[path[i + 1]]) {
                        reserveIn = result[0];
                        reserveOut = result[1];
                    } else {
                        reserveIn = result[1];
                        reserveOut = result[0];
                    }
                })
                .catch((err) => {
                    console.log('getReserveErr', err);
                });

            amount1 = getAmountOut(amount0, reserveIn, reserveOut);
            amount0 = amount1;
        }
        return Math.floor(amount1 * 0.7);
    }
    
    const handleSubmit = async () => {
        if (!approved) {
            let contractTokenInstance = getContractInstance(tokenABI, addressSet[token_names[0]]);
            await approveFunction(contractTokenInstance);
        }
        else {
            if (amountValue[0] > balanceValue[0]) {
                return;
            }
            let token0_address = addressSet[token_names[0]];
            let token1_address = addressSet[token_names[1]];
            let contractPancakeRouter = getContractInstance(pancakeRouterABI, routerAddress);
            let deadline = 2000000000;
    
            if (token_names[0] == "BNB" && token_names[1] == "KLEAR") {
                let path = [token0_address, token1_address];
                let value = amountValue[0] * Math.pow(10, 18);
                let amountOutMin = 0;
                console.log(amountOutMin);
    
                try {
                    await contractPancakeRouter.methods.swapExactETHForTokens(
                        amountOutMin.toString(),
                        path,
                        walletAddress,
                        deadline
                    ).send({ from: walletAddress, value: value.toString() });
                } catch (error) {
                    console.log(error)
                }
            } else if (token_names[0] == "KLEAR" && token_names[1] == "BNB") {
                let amountIn = amountValue[0] * Math.pow(10, 9);
                let path = [token0_address, token1_address];
                let amountOutMin = 0;
                console.log(amountIn);
                console.log(amountOutMin);
                console.log(path);
                console.log(walletAddress);
                console.log(deadline);
                try {
                    await contractPancakeRouter.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        amountIn.toString(),
                        amountOutMin.toString(),
                        path,
                        walletAddress,
                        deadline
                    ).send({ from: walletAddress });
                } catch (error) {
                    console.log(error)
                }
            } else {
                let decimals = 18;
                if (token_names[0] == 'KLEAR') decimals = 9;
                let amountIn = amountValue[0] * Math.pow(10, decimals);
                let path = [token0_address, addressSet['BNB'], token1_address];
                let amountOutMin = 0;
    
                try {
                    await contractPancakeRouter.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn.toString(),
                        amountOutMin.toString(),
                        path,
                        walletAddress,
                        deadline
                    ).send({ from: walletAddress });
                } catch (error) {
                    console.log(error)
                }
            }
        }
    }

    const handleConvert = async () => {
        setToken_names([token_names[1], token_names[0]]);
        setBalanceValue([balanceValue[1], balanceValue[0]]);
        setAmountValue([amountValue[1], amountValue[0]]);
        token_list = [token_list[1], token_list[0]];

        if(rate) setRate(1 / rate);
        if (token_names[1] == "BNB") setApproved(true);
        else {
            let flag = await checkApproval(token_names[1]);
            setApproved(flag);
        }
    }

    React.useEffect(async () => {
        if (walletAddress != "") {
            let balance0 = await getBalance(token_names[0]);
            let balance1 = await getBalance(token_names[1]);
            setBalanceValue([balance0, balance1]);
            setRateFunction(token_names);
            
            console.log("---", web3Instance.eth);
            console.log("kill", amountValue[0]);
        }

        if (props.status === "buy") {
            openTransak();
        }
    }, [walletAddress]);

    const SwapTokenComponent = (order) => {
        return (
            <div className="swap-token">
                <div className="swap-balance">
                    <Row>
                        <Col xs={4} md={8} className="from-div">
                            {fromToLabel[order]}
                        </Col>
                        {walletAddress != "" && (
                            <Col xs={4} md={2} className="balance-div" style={{ padding: "0px" }}>
                                Balance:
                            </Col>
                        )}
                        {walletAddress != "" && (
                            <Col xs={4} md={2} className="balanceValue-div" style={{ padding: "2px" }}>
                                {balanceValue[order].toFixed(6)}
                            </Col>
                        )}
                    </Row>
                </div>
                <div className="swap-value">
                    <Row>
                        <Col xs={12} md={7}>
                            <input
                                type="text"
                                className="swap-value-input"
                                placeholder=""
                                value={amountValue[order]}
                                onChange={(e) => handleChangeInput(e, order)}
                            />
                        </Col>
                        <Col xs={12} md={2}>
                            {order == 0 && (
                                <button className="swap-max-btn" onClick={handleMax}>
                                    max
                                </button>
                            )}
                            {order == 1 && (
                                <button className="swap-max-btn max-empty" style={{ opacity: "0" }}>
                                    max
                                </button>
                            )}
                        </Col>
                        <Col xs={12} md={3}>
                            <button className="swap-tokenList-btn" onClick={() => handleClickOpen(order)} >
                                {token_names[order] == "BNB" && (
                                    <img className="swap-token-image" src={bnbImage} alt="bnbImage" />
                                )}
                                {token_names[order] == "BUSD" && (
                                    <img className="swap-token-image" src={busdImage} alt="busdImage" />
                                )}
                                {token_names[order] == "KLEAR" && (
                                    <img className="swap-token-image" src={klearImage} alt="klearImage" />
                                )}

                                &nbsp;{token_names[order]}
                                <img className="swap-token-image" src={arrowDown} alt="arrowDown" />
                            </button>
                        </Col>
                    </Row>
                </div>
            </div>
        )
    }

    return (
        <div className="swap-container">
            <div>
                <TokenListDialog
                    selectedValue={selectedValue}
                    open={open}
                    onClose={handleClose}
                    getContractInstance={getContractInstance}
                    getBalance={getBalance}
                />
            </div>
            
            <img className="neon-image neon-image0" src={neonImage0} alt="neonImage0" />
            <img className="neon-image neon-image1" src={neonImage1} alt="neonImage1" />
            <img className="neon-image neon-image2" src={neonImage2} alt="neonImage2" />
            <img className="neon-image neon-image3" src={neonImage3} alt="neonImage3" />
            <img className="neon-image neon-image4" src={neonImage4} alt="neonImage4" />
            <img className="neon-image neon-image5" src={neonImage5} alt="neonImage5" />
            <img className="neon-image neon-image6" src={neonImage6} alt="neonImage6" />
            <img className="neon-image neon-image7" src={neonImage7} alt="neonImage7" />
            <img className="neon-image neon-image8" src={neonImage8} alt="neonImage8" />
            <img className="neon-image neon-image9" src={neonImage9} alt="neonImage9" />

            <div className="swap-header">
                Swap
            </div>
            <hr></hr>
            <div className="swap-body">
                <div className="swap-body-container">
                    {SwapTokenComponent(0)}
                    <div className="swap-button">
                        <button className="swap-convert-btn" onClick={handleConvert} >
                            <img className="swap-convert-image" src={swapBtnImage} alt="swapBtnImage" />
                        </button>
                    </div>
                    {SwapTokenComponent(1)}
                    <div className="swap-price">
                        <Row>
                            <Col xs={12} md={5} className="from-div">
                                Price
                            </Col>
                            <Col xs={6} md={4} className="balance-div" style={{ paddingRight: "5px" }}>
                                {rate}
                            </Col>
                            <Col xs={6} md={3} className="balanceValue-div" style={{padding: "0px"}}>
                                {token_names[1]} per {token_names[0]}
                            </Col>
                        </Row>
                    </div>
                </div>
            </div>
            <div className="swap-footer">
                {approved && (
                    <button className="swap-submit-btn" onClick={handleSubmit}>
                        Exchange
                    </button>
                )}
                {!approved && (
                    <button className="swap-submit-btn" onClick={handleSubmit}>
                        Approve
                    </button>
                )}
            </div>
        </div>
    );
}

export default SwapComponent;