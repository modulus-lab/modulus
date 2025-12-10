import express from 'express';
import * as jose from 'jose';

const router = express.Router();

router.prototype.name = "Transaction Details";
router.prototype.desc = "Mocks to fake transaction details"
router.prototype.defaultResponse = "success"
router.prototype.responses = [
  {
    id: "success",
    name: "success"
  },
  {
    id: "error",
    name: "error"
  }
]

// helpers: random integer and random past date (at least minMonthsAgo ago)
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPastDate(minMonthsAgo = 6, maxMonthsAgo = 24): string {
    const minDays = Math.ceil(minMonthsAgo * 30);
    const maxDays = Math.ceil(maxMonthsAgo * 30);
    const daysAgo = randomInt(minDays, maxDays);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

router.get('/api/users/:userId/transactions', (req, res) => {

    const baseDate = randomPastDate(6, 24); // at least 6 months ago, up to 24 months
    const count = randomInt(5, 100); // between 5 and 100
    const transactions = generateTransactions(baseDate, count);
    res.send({
        userId: req.params.userId,
        transactions: transactions,
    });
});


const debitChannels = [
    "Debit Card",
    "Cash Withdrawal",
    "ATM Withdrawal",
    "UPI Debit",
    "Internet Banking Debit",
];

const creditChannels = [
    "Credit Card",
    "UPI",
    "Internet Banking",
    "Digital Wallet",
    "E-commerce",
];

export type Tx = {
    date: string;
    description: string;
    type: "DEBIT" | "CREDIT";
    amount: string;
    channel: string;
};

export function generateTransactions(baseDate: string, count: number): Tx[] {
    const txs: Tx[] = [];
    for (let i = 0; i < count; i++) {
        const creditSeed = Math.random() * 25;
        const type = i % creditSeed === 0 ? "CREDIT" : "DEBIT";
        txs.push(getRandomData(addDays(baseDate, i), type));
    }
    return txs;
}


function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    d.setDate(d.getDate() + days);
    return `${yyyy}-${mm}-${dd}`;
}

function getRandomData(date: string, type: "DEBIT" | "CREDIT"): Tx {
    const amount = Math.floor(Math.random() * 10000).toString();
    const channels = type === "DEBIT" ? debitChannels : creditChannels;
    const seed = Math.floor(Math.random() * channels.length);
    const channel = channels[seed]!!;
    const descriptionsForChannel = descriptions[channel]!!;
    const description =
        descriptionsForChannel[
            Math.floor(Math.random() * descriptionsForChannel.length)
            ]!!;
    return { date, amount, type, channel, description };
}

const descriptions: Record<string, string[]> = {
    "Debit Card": [
        "Grocery purchase at supermarket",
        "Clothing and apparel purchase",
        "Dining/restaurant spend",
        "Electronics store purchase",
        "Fuel station payment",
        "Pharmacy/medical store purchase",
    ],
    "Cash Withdrawal": [
        "Cash withdrawn at bank branch counter",
        "Cash withdrawal via teller",
        "Over-the-counter cash withdrawal",
    ],
    "ATM Withdrawal": [
        "Cash withdrawal at ATM",
        "ATM cash dispense transaction",
        "Cash withdrawn from out-of-network ATM",
    ],
    "UPI Debit": [
        "UPI payment to merchant",
        "UPI transfer to friend",
        "UPI payment for food delivery",
        "Bill payment via UPI",
        "UPI transfer to utility provider",
    ],
    "Internet Banking Debit": [
        "Online bill payment via net banking",
        "Fund transfer using NEFT/IMPS",
        "Subscription renewal through internet banking",
        "Utility payment using net banking",
        "E-commerce purchase through internet banking",
    ],
    "Credit Card": [
        "Refund from merchant on credit card",
        "Cashback credited to credit card account",
        "Reward points redemption credit",
        "Reversal of previous card transaction",
        "Credit card promotional bonus credit",
    ],
    UPI: [
        "UPI transfer received from friend",
        "UPI refund from merchant",
        "UPI payment reversal credit",
        "Salary component received via UPI",
        "UPI cashback credited",
    ],
    "Internet Banking": [
        "Salary credited via net banking",
        "NEFT/IMPS transfer received",
        "Refund from e-commerce site via net banking",
        "Interest income credited",
        "Reversal of previous bank charge",
    ],
    "Digital Wallet": [
        "Wallet cashback credited",
        "Refund from wallet transaction",
        "Wallet top-up reversal",
        "Promotional credit added to wallet",
        "Peer-to-peer wallet transfer received",
    ],
    "E-commerce": [
        "Online order refund processed",
        "Return item credit from marketplace",
        "Promotional credit from e-commerce platform",
        "Reversal of duplicate online transaction",
        "Gift card balance credited after refund",
    ],
};

export default router;

