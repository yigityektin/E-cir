export interface Task {
  id: string;
  label: string;
  category: string;
  description: string;
}

export const PREDEFINED_TASKS: Task[] = [
  // ── Erdős / Number Theory ───────────────────────────────────────────────────
  {
    id: "collatz",
    label: "Collatz Conjecture",
    category: "Erdős / Number Theory",
    description:
      "Find the starting number under 1,000,000 that produces the longest Collatz sequence. " +
      "Return the number, the chain length, and list the first 20 steps of its sequence. " +
      "Also verify: does every starting number you tested eventually reach 1?",
  },
  {
    id: "goldbach",
    label: "Goldbach's Conjecture",
    category: "Erdős / Number Theory",
    description:
      "Verify Goldbach's Conjecture for all even integers from 4 to 100,000: every even integer " +
      "greater than 2 is the sum of two primes. Express the first 10 even numbers as prime sums, " +
      "report how many decompositions each has, and state whether any counterexample was found.",
  },
  {
    id: "erdos_straus",
    label: "Erdős–Straus Conjecture",
    category: "Erdős / Number Theory",
    description:
      "For every integer n from 2 to 1000, find integers a, b, c ≥ 1 such that " +
      "4/n = 1/a + 1/b + 1/c (Erdős–Straus Conjecture). " +
      "Show a valid decomposition for n = 2, 5, 7, 11, 97, and 997. " +
      "Report the hardest n you encountered (fewest solutions).",
  },
  {
    id: "happy_numbers",
    label: "Happy Numbers (Erdős)",
    category: "Erdős / Number Theory",
    description:
      "Implement the happy number algorithm: repeatedly replace a number with the sum of squares " +
      "of its digits until it reaches 1 (happy) or loops forever at 4 (unhappy). " +
      "Find all happy numbers under 1000, prove the unhappy cycle always contains 4, " +
      "and find the smallest happy prime.",
  },
  {
    id: "twin_primes",
    label: "Twin Prime Conjecture",
    category: "Erdős / Number Theory",
    description:
      "Find all twin prime pairs (p, p+2) where both are prime and p < 1,000,000. " +
      "Count the total pairs, report the 5 largest, and compute the ratio of twin primes " +
      "to all primes in that range. Does the density decrease as expected?",
  },
  {
    id: "perfect_numbers",
    label: "Perfect & Abundant Numbers",
    category: "Erdős / Number Theory",
    description:
      "Find all perfect numbers less than 10,000,000 (a number equals the sum of its proper divisors). " +
      "Also find all abundant numbers under 10,000 and compute what fraction of integers are abundant. " +
      "Verify the Euclid–Euler theorem: every even perfect number has the form 2^(p-1)(2^p - 1).",
  },

  // ── Cryptography & Blockchain ────────────────────────────────────────────────
  {
    id: "merkle_tree",
    label: "Merkle Tree",
    category: "Cryptography",
    description:
      "Implement a Merkle tree in Python from scratch using SHA-256. " +
      "Given 8 transaction strings, build the tree, compute the root hash, " +
      "generate a proof of inclusion for the 3rd transaction, " +
      "and write a verifier that confirms the proof without knowing all transactions.",
  },
  {
    id: "zkp_discrete_log",
    label: "Zero-Knowledge Proof",
    category: "Cryptography",
    description:
      "Implement a non-interactive zero-knowledge proof for the discrete logarithm problem " +
      "using the Schnorr protocol. The prover knows x such that g^x ≡ h (mod p). " +
      "Show a complete Prover–Verifier interaction where x is never revealed, " +
      "and demonstrate that a cheating prover without x cannot succeed.",
  },
  {
    id: "ethereum_validator",
    label: "Ethereum Address Validator",
    category: "Blockchain",
    description:
      "Write a Python function that validates Ethereum addresses and returns a detailed summary: " +
      "whether the address is EIP-55 checksummed, all-lowercase, all-uppercase, or invalid. " +
      "Test with 5 examples covering each case and explain the checksum algorithm.",
  },
  {
    id: "eip1559",
    label: "EIP-1559 Gas Simulator",
    category: "Blockchain",
    description:
      "Simulate the EIP-1559 fee market for 50 blocks. Start with baseFee = 10 gwei, " +
      "randomly vary block fullness between 50–150% of the gas target, " +
      "and compute how baseFee evolves. Plot (in ASCII) the baseFee trajectory " +
      "and compute the average user overpayment vs. a static fee model.",
  },

  // ── Algorithms & Data Structures ────────────────────────────────────────────
  {
    id: "dijkstra_defi",
    label: "Optimal Swap Route (Dijkstra)",
    category: "Algorithms",
    description:
      "Model a DeFi swap graph: 8 liquidity pools as nodes, each edge has a fee (0.05%–1%). " +
      "Implement Dijkstra's algorithm to find the optimal route from token A to token E " +
      "that minimizes total fees. Print all candidate routes and explain why the chosen one wins.",
  },
  {
    id: "byzantine",
    label: "Byzantine Fault Tolerance",
    category: "Algorithms",
    description:
      "Implement a simplified PBFT (Practical Byzantine Fault Tolerance) consensus simulation " +
      "with 4 nodes where 1 is Byzantine (sends conflicting messages). " +
      "Show the Prepare → Promise → Commit phases and prove that the honest nodes " +
      "still reach agreement on the correct value despite the faulty node.",
  },
  {
    id: "sorting_race",
    label: "Sorting Algorithm Benchmark",
    category: "Algorithms",
    description:
      "Implement 5 sorting algorithms: Quicksort, Mergesort, Heapsort, Timsort, and Radix sort. " +
      "Benchmark all 5 on arrays of 10,000 random integers, nearly-sorted integers, and reverse-sorted integers. " +
      "Report time complexity, actual runtimes, and declare the winner for each case.",
  },
];

export const CATEGORIES = [...new Set(PREDEFINED_TASKS.map((t) => t.category))];

export const CUSTOM_TASK_ID = "__custom__";
