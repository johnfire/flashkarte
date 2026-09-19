# Transformers — concept DAG, draft v0

_Date: 2026-09-19 · Status: **hypothesis for review, not fact** · Built from the 86 cards of
"Transformers in LLMs: mechanics and pipeline" (deck `1be176cf…`, read via MCP the same day)_

Companion to [the authoring strategy](2026-09-19-course-authoring-strategy.md). This is
steps 3–5 of that pipeline done on paper for one subject: concept inventory, edges with a
written reason each, and graph lint. No code, no schema.

## 1. Read this first

- **An LLM drafted every edge here** (from the card text plus general knowledge of the
  subject). The lint below proves the graph is _self-consistent_; it says **nothing** about
  whether an edge is _right_. Only a reader who understands the subject can judge that,
  which is why every edge carries its reason. Section 6 lists the edges I am least sure of.
- An edge `A → B` (written "B requires A") means: _a bright newcomer could not follow the
  explanation of B without A._ It does not mean "A comes before B in the pipeline."
- **Map nodes** (unit 0) have no prerequisites on purpose. They are the shape-first
  overview: read and orient, never gating. The capstone in unit 7 re-tests the map.
- **External assumptions** (`ext-*`) are things the course does not teach. See §2.

## 2. What the course assumes (entry floor)

"From nothing" needs an honest floor. These nine are used by the graph; a learner who lacks
them needs a prerequisite course, or a diagnostic pre-test that sends them there.

| id            | Assumed knowledge                                                   | Used by                                                                             |
| ------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ext-matmul`  | matrices, shapes, matrix multiplication                             | 5 concept(s): `shape-notation`, `embedding-table`, `parameters`, `qkv-projections`… |
| `ext-dot`     | dot product as a similarity score                                   | 1 concept(s): `attention-scores`                                                    |
| `ext-prob`    | a probability distribution (non-negative, sums to 1)                | 2 concept(s): `softmax`, `autoregressive-factorization`                             |
| `ext-deriv`   | a derivative as 'how much the output changes per unit input change' | 1 concept(s): `gradient-backprop`                                                   |
| `ext-exp-log` | exp and log                                                         | 2 concept(s): `softmax`, `pretraining-loss`                                         |
| `ext-stats`   | mean and variance                                                   | 2 concept(s): `score-scaling`, `layernorm`                                          |
| `ext-rot`     | sin/cos and 2-D rotation                                            | 2 concept(s): `sinusoidal-position`, `rope`                                         |
| `ext-rnn`     | what a recurrent network (RNN) is                                   | 1 concept(s): `transformer-vs-rnn`                                                  |
| `ext-rank`    | matrix rank                                                         | 2 concept(s): `qk-bilinear-form`, `vo-product`                                      |

The heaviest floors are matrix multiplication and the dot product: attention is unlearnable
without them. `ext-rnn`, `ext-rank` and `ext-rot` each gate only one or two concepts, so
those concepts could instead be tagged optional.

## 3. Numbers, and what the lint checked

|                                     |                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Concepts                            | **73** (65 core, 8 extension) covering all 86 cards                                                                                                                                                                                                                                                                |
| Prerequisite edges inside the graph | **137** (+ 18 edges to external assumptions)                                                                                                                                                                                                                                                                       |
| Longest prerequisite chain          | **16 concepts:** `token` → `vocabulary` → `token-id` → `embedding` → `attention-gist` → `qkv-projections` → `attention-scores` → `attention-weights` → `attention-output` → `multi-head-attention` → `preln-block` → `block-stack-shape-contract` → `prefill-vs-decode` → `kv-cache` → `kv-cache-size` → `mqa-gqa` |
| Roots (no in-graph prerequisite)    | `pipeline-map`, `transformer-vs-llm`, `token`, `shape-notation`, `softmax`, `parameters`                                                                                                                                                                                                                           |

Lint results (script run on this same data):

- **Acyclic.** Yes.
- **Unit order respects `requires`.** Yes. No concept sits in an earlier unit than one of its
  prerequisites. (`absolute-vs-rope` and `vocab-size-tradeoff` are in unit 5, not beside their
  card neighbours in units 4 and 1, for exactly this reason: they need the residual stream
  and the unembedding.)
- **No non-capstone concept has more than 4 prerequisites.** Yes. Capstones exceed it by nature.
- **Every card maps to at least one concept**, except two lookup-only cards (65, 86). Card 8
  (symbol table) is attached to `shape-notation` as reference.
- **Not checked:** whether any edge is correct, whether a needed edge is missing, whether
  concepts are truly atomic. Those need a human.

## 4. The graph, by unit

Units follow the shape-first choice: map, then the two ends of the pipeline, then the
training background the middle needs, then the middle (attention, the block), then running
it, then synthesis. Within a unit, concepts are in dependency order. `L` is the concept's
depth in the graph (0 = no prerequisites). Card numbers are the deck's current numbering.

### Unit 0 — Map (orient, ungated)

- **`pipeline-map`** — The pipeline map (text, IDs, vectors, block stack, logits, token, repeat) · cards 18 · map · L0
- **`transformer-vs-llm`** — 'Transformer' versus 'LLM' · cards 80 · term · L0

### Unit 1 — Input side: text to vectors

- **`token`** — Token · cards 1 · term · L0
- **`shape-notation`** — Reading n x d_model and the deck's symbols · cards 7, 8 · skill · L0
  - assumes: `ext-matmul`
- **`vocabulary`** — Vocabulary and V · cards 2 · term · L1
  - requires: `token` (V counts tokens)
- **`sequence-length`** — Sequence length n and context window · cards 5 · term · L1
  - requires: `token` (n counts tokens)
- **`token-id`** — Token ID · cards 3 · term · L2
  - requires: `vocabulary` (an ID is a position in the vocabulary list)
- **`tokenizer`** — Tokenizer · cards 4 · term · L3
  - requires: `token-id` (it maps text to and from ID sequences)
- **`embedding`** — Embedding and d_model · cards 6 · idea · L3
  - requires: `token-id` (an embedding is what an ID is turned into)
- **`subword-tokenization`** — Why subwords (and what tokens-not-characters costs) · cards 22, 26 · idea · L4
  - requires: `tokenizer` (compares ways a tokenizer can split text)
- **`embedding-table`** — The embedding table E (V x d_model) · cards 29 · skill · L4
  - requires: `embedding` (E holds the embeddings); `shape-notation` (the card is about shapes)
  - assumes: `ext-matmul`
- **`bpe`** — Byte-pair encoding (incl. byte-level) · cards 23, 24 · idea · L5
  - requires: `subword-tokenization` (BPE is one way to build a subword vocabulary)

### Unit 2 — Output side: scores to a token

- **`softmax`** — Softmax · cards 14 · idea · L0
  - assumes: `ext-prob`, `ext-exp-log`
- **`logits`** — Logits · cards 13 · term · L2
  - requires: `vocabulary` (one raw score per vocabulary token)
- **`next-token-distribution`** — One forward pass gives P(next token) at every position · cards 19 · idea · L3
  - requires: `logits` (the raw output); `softmax` (turns logits into probabilities)
- **`temperature`** — Temperature · cards 70 · idea · L3
  - requires: `softmax` (it rescales the input to softmax); `logits` (it divides the logits)
- **`sampling`** — Sampling · cards 15 · idea · L4
  - requires: `next-token-distribution` (you pick from that distribution)
- **`autoregressive-generation`** — Autoregressive generation (why 200 tokens = 200 passes) · cards 16, 20 · idea · L5
  - requires: `sampling` (each step samples one token); `sequence-length` (n grows by one per step)
- **`decoding-strategies`** — Greedy, top-k, top-p · cards 71 · idea · L5
  - requires: `sampling` (they are ways of choosing the sample); `next-token-distribution` (they act on its probabilities)
  - suggests: `temperature`
- **`autoregressive-factorization`** — Autoregressive factorization of P(sequence) · cards 21 · idea · _extension_ · L6
  - requires: `autoregressive-generation` (the formula restates the loop)
  - assumes: `ext-prob`

### Unit 3 — Training basics

- **`parameters`** — Parameters (weights) · cards 9 · term · L0
  - assumes: `ext-matmul`
- **`training-vs-inference`** — Training versus inference · cards 10 · idea · L1
  - requires: `parameters` (training changes them, inference freezes them)
- **`loss`** — Loss · cards 11 · term · L2
  - requires: `training-vs-inference` (loss is the training signal)
- **`gradient-backprop`** — Gradient and backpropagation · cards 11 · idea · L3
  - requires: `loss` (the gradient is of the loss)
  - assumes: `ext-deriv`
- **`pretraining-loss`** — Pretraining loss and perplexity · cards 72 · idea · L4
  - requires: `loss` (it is the loss for this task); `next-token-distribution` (cross-entropy on the true next token)
  - assumes: `ext-exp-log`
- **`training-compute`** — Training compute is about 6ND · cards 75 · skill · _extension_ · L4
  - requires: `parameters` (N is parameter count); `gradient-backprop` (the backward pass costs about 2x forward)
- **`tokenizer-not-trained`** — The tokenizer is fixed, not learned · cards 27, 28 · idea · L5
  - requires: `tokenizer` (the thing in question); `gradient-backprop` (gradients cannot pass through discrete splits); `embedding-table` (gradients reach only looked-up rows)
- **`pretrain-vs-posttrain`** — Pretraining versus post-training · cards 74 · idea · L5
  - requires: `pretraining-loss` (pretraining minimises it); `training-vs-inference` (both are training stages)
- **`teacher-forcing`** — Teacher forcing (all positions in one pass) · cards 73 · idea · L6
  - requires: `pretraining-loss` (targets are the input shifted by one); `autoregressive-generation` (contrast with generation one step at a time); `training-vs-inference` (a training-only trick)

### Unit 4 — Attention

- **`attention-gist`** — Attention, at the highest level · cards 17 · idea · L4
  - requires: `embedding` (attention updates token vectors); `sequence-length` (it looks across the n positions)
- **`qkv-projections`** — Q, K, V projections · cards 30 · skill · L5
  - requires: `attention-gist` (they are how attention is computed); `shape-notation` (the card is about shapes); `parameters` (W_Q, W_K, W_V are learned)
  - assumes: `ext-matmul`
- **`attention-scores`** — Attention scores Q K^T · cards 31 · skill · L6
  - requires: `qkv-projections` (built from Q and K)
  - assumes: `ext-dot`
- **`attention-weights`** — Attention weights: row-wise softmax · cards 31, 34, 35 · idea · L7
  - requires: `attention-scores` (softmax of the scores); `softmax` (the operation used)
- **`score-scaling`** — Why divide by sqrt(d_k) · cards 32 · idea · L7
  - requires: `attention-scores` (it rescales them); `softmax` (large scores saturate softmax)
  - assumes: `ext-stats`
- **`attention-cost`** — Attention cost grows with n squared · cards 37 · idea · L7
  - requires: `attention-scores` (the n x n score matrix); `sequence-length` (n is the variable)
- **`qk-bilinear-form`** — W_Q W_K^T is one bilinear form · cards 51 · idea · _extension_ · L7
  - requires: `attention-scores` (the form the scores use)
  - assumes: `ext-rank`
- **`attention-output`** — Attention output is a weighted average of values · cards 31, 33 · idea · L8
  - requires: `attention-weights` (they are the averaging weights); `qkv-projections` (V supplies the values)
- **`causal-mask`** — Causal mask (and why before softmax) · cards 41, 42, 43 · idea · L8
  - requires: `attention-weights` (it edits the scores that become weights); `softmax` (masking works through softmax renormalisation)
- **`self-vs-cross-attention`** — Self- versus cross-attention · cards 36 · idea · L9
  - requires: `attention-output` (they differ only in where Q and K,V come from)
- **`multi-head-attention`** — Multi-head attention · cards 38, 39 · idea · L9
  - requires: `attention-output` (a head is one such computation); `shape-notation` (heads split d_model)
- **`mask-in-training`** — Why the mask matters in training · cards 44 · idea · L9
  - requires: `causal-mask` (the mechanism); `teacher-forcing` (the setting where whole sequences are fed at once)
- **`position-need`** — Why position information is needed · cards 45 · idea · L9
  - requires: `attention-output` (a weighted average ignores token order)
- **`mha-parameter-count`** — Parameter count of multi-head attention (4 d_model^2) · cards 40 · skill · L10
  - requires: `multi-head-attention` (counts its matrices)
- **`sinusoidal-position`** — Sinusoidal position encoding · cards 46 · idea · L10
  - requires: `position-need` (a fix for it); `embedding` (added to embeddings)
  - assumes: `ext-rot`
- **`learned-absolute-position`** — Learned absolute position embeddings · cards 47 · idea · L10
  - requires: `position-need` (a fix for it); `embedding-table` (same lookup-table idea)
- **`rope`** — Rotary position embedding (RoPE) · cards 48, 49 · idea · L10
  - requires: `position-need` (a fix for it); `attention-scores` (it rotates q and k before the dot product)
  - assumes: `ext-rot`
- **`vo-product`** — Only W_V W_O matters in a head · cards 52 · idea · _extension_ · L10
  - requires: `multi-head-attention` (W_O belongs to the multi-head layer)
  - assumes: `ext-rank`

### Unit 5 — The block and the stack

- **`hidden-states-layer`** — Layers and hidden states · cards 12 · term · L4
  - requires: `embedding` (hidden states are per-token vectors); `parameters` (each layer has its own)
- **`residual-connection`** — Residual connection and the residual stream · cards 55 · idea · L5
  - requires: `hidden-states-layer` (it adds a layer's output to its input); `gradient-backprop` (the point is an identity path for gradients)
- **`layernorm`** — LayerNorm · cards 56 · skill · L5
  - requires: `hidden-states-layer` (it normalises a token's hidden vector)
  - assumes: `ext-stats`
- **`ffn`** — Feed-forward sublayer · cards 58 · skill · L5
  - requires: `hidden-states-layer` (it transforms each token's vector); `shape-notation` (d_model x d_ff)
  - assumes: `ext-matmul`
- **`rmsnorm`** — RMSNorm · cards 57 · idea · L6
  - requires: `layernorm` (defined as a change to it)
- **`ffn-activations`** — FFN activations (ReLU, GELU, SwiGLU) · cards 66 · idea · _extension_ · L6
  - requires: `ffn` (they are its nonlinearity)
- **`ffn-kv-memory`** — FFN as key-value memory · cards 67 · idea · _extension_ · L9
  - requires: `ffn` (the hypothesis is about it); `attention-output` (uses the key/value analogy)
- **`attention-vs-ffn-roles`** — Attention mixes positions; FFN mixes features · cards 59 · idea · L10
  - requires: `ffn` (one of the two); `multi-head-attention` (the other)
- **`preln-block`** — The pre-LN transformer block · cards 60 · idea · L10
  - requires: `residual-connection` (each sublayer sits in a residual branch); `layernorm` (applied to each sublayer's input); `ffn` (one sublayer); `multi-head-attention` (the other sublayer)
- **`absolute-vs-rope`** — Where position enters: absolute versus RoPE · cards 50 · idea · L11
  - requires: `rope` (one of the two); `sinusoidal-position` (the other (either absolute scheme works)); `residual-connection` (absolute position travels through the residual stream)
- **`block-stack-shape-contract`** — Same shape in and out, so blocks stack · cards 61 · idea · L11
  - requires: `preln-block` (the shape contract of that block); `shape-notation` (it is stated in shapes)
- **`pre-vs-post-ln`** — Pre-LN versus post-LN · cards 62, 63 · idea · L11
  - requires: `preln-block` (one of the two layouts); `gradient-backprop` (the difference is gradient behaviour at init)
- **`params-per-block`** — Parameters per block (about 12 d_model^2) · cards 64 · skill · L11
  - requires: `mha-parameter-count` (the attention share); `ffn` (the FFN share)
- **`attention-not-explanation`** — Attention weights are not a full explanation · cards 53, 54 · idea · _extension_ · L12
  - requires: `multi-head-attention` (many heads); `ffn` (the other computation the weights ignore); `block-stack-shape-contract` (many layers)
- **`unembedding`** — Unembedding (d_model to V) and the final norm · cards 68 · skill · L12
  - requires: `block-stack-shape-contract` (it consumes the stack's output); `logits` (it produces them); `layernorm` (the final norm); `shape-notation` (d_model x V)
- **`vocab-size-tradeoff`** — The trade-off in choosing V · cards 25 · idea · L13
  - requires: `subword-tokenization` (V comes from the split scheme); `embedding-table` (larger V, larger E); `unembedding` (larger V, wider output layer)
- **`weight-tying`** — Weight tying · cards 69 · idea · _extension_ · L13
  - requires: `unembedding` (one of the two matrices); `embedding-table` (the other)

### Unit 6 — Running it: inference engineering

- **`prefill-vs-decode`** — Prefill versus decode · cards 76 · idea · L12
  - requires: `autoregressive-generation` (decode is the one-token loop); `block-stack-shape-contract` (a whole pass through the stack); `causal-mask` (why the prompt can be processed in parallel)
- **`kv-cache`** — The KV cache and why it is valid · cards 77 · idea · L13
  - requires: `prefill-vs-decode` (prefill fills it, decode reuses it); `attention-output` (K and V are what is cached); `causal-mask` (earlier positions never see later ones, so their K,V never change)
- **`kv-cache-size`** — KV-cache size · cards 78 · skill · L14
  - requires: `kv-cache` (what is being sized); `multi-head-attention` (heads and d_head set the size)
- **`mqa-gqa`** — Multi-query and grouped-query attention · cards 79 · idea · L15
  - requires: `kv-cache-size` (they exist to shrink it); `multi-head-attention` (they modify how heads share K,V)

### Unit 7 — Synthesis

- **`transformer-vs-rnn`** — Why transformers displaced RNNs · cards 82 · idea · L9
  - requires: `attention-output` (direct paths between any two tokens); `teacher-forcing` (parallel training)
  - assumes: `ext-rnn`
- **`architecture-families`** — Encoder-only, decoder-only, encoder-decoder · cards 83, 84 · idea · L10
  - requires: `causal-mask` (the mask is what separates BERT from GPT); `pretraining-loss` (the objectives differ); `self-vs-cross-attention` (encoder-decoder uses cross-attention)
- **`pipeline-order-capstone`** — Capstone: put the inference pipeline in order · cards 18 · capstone · L13
  - requires: `tokenizer` (step 1); `embedding-table` (step 2); `sinusoidal-position` (position information is added early (any scheme)); `block-stack-shape-contract` (the stack); `unembedding` (logits); `softmax` (probabilities); `sampling` (choose a token); `autoregressive-generation` (loop)
- **`learned-vs-fixed-parts`** — Capstone: which parts are learned, which fixed · cards 81 · capstone · L13
  - requires: `tokenizer-not-trained` (the fixed part); `embedding-table` (learned); `qkv-projections` (learned); `ffn` (learned); `layernorm` (learned gains); `unembedding` (learned)
- **`context-window-limits`** — What limits the context window · cards 85 · idea · L15
  - requires: `sequence-length` (the quantity limited); `learned-absolute-position` (trained position range); `attention-cost` (n squared); `kv-cache-size` (cache grows with n)

## 5. What building the graph revealed about the deck

**Cards that are two or three concepts and need splitting** (each concept needs its own item):

- Card 11: `loss` and `gradient-backprop`.
- Card 31: scaled dot-product attention is really `attention-scores`, `attention-weights`
  and `attention-output` in one answer.
- Card 18: two jobs. As orientation it is `pipeline-map` (unit 0); as an ordering exercise it
  is `pipeline-order-capstone` (unit 7). It needs to exist once as each, differently.

**Reference cards, not concepts** (a lookup fact cannot be "mastered" by reasoning; keep them
as reference or drop them from gating): card 8 (symbol table), 65 (typical model sizes),
86 (original paper's configuration).

**Cards that read as forward references in the deck's current order** (8 references from 6
concepts). The deck is mostly well ordered already, so this is a short list:

| Card                           | needs                        | which is card |
| ------------------------------ | ---------------------------- | ------------- |
| 15 `sampling`                  | `next-token-distribution`    | 19            |
| 25 `vocab-size-tradeoff`       | `embedding-table`            | 29            |
| 25 `vocab-size-tradeoff`       | `unembedding`                | 68            |
| 27 `tokenizer-not-trained`     | `embedding-table`            | 29            |
| 44 `mask-in-training`          | `teacher-forcing`            | 73            |
| 50 `absolute-vs-rope`          | `residual-connection`        | 55            |
| 53 `attention-not-explanation` | `ffn`                        | 58            |
| 53 `attention-not-explanation` | `block-stack-shape-contract` | 61            |

The two worth noting: card 44 (why the mask matters in training) needs teacher forcing
(card 73), and card 50 (absolute versus RoPE) needs the residual stream (card 55).

**Missing from the deck entirely** (the graph needed them and no card exists):

- Any teaching of the external floor (dot product, matmul, distributions). Fine if they are
  assumed; fatal for "from nothing." This is a scope decision, not an authoring bug.
- **Why nonlinearity matters** in the FFN (card 58 states the formula and stops).
- **What depth buys** (early versus late layers). "L blocks stacked" is stated, never motivated.
- **What an RNN is**, needed by card 82's comparison.

**Limits of a plain DAG this exposed.** Position information can be supplied several ways
(sinusoidal, learned, RoPE). "Requires position information" then means _any one of these_,
which a plain AND-only graph cannot say. I worked around it by requiring
`sinusoidal-position` in two places as a stand-in. The data model needs either OR-groups
(`requires any of [...]`) or an umbrella concept `position-scheme` that the alternatives
specialise. I lean to the umbrella concept: it keeps the graph a simple DAG.

## 6. Where I am least sure (review these first)

Ranked by how much a wrong call would change the course:

1. **`attention-gist` requires `embedding`, and `softmax` is a root.** I put the softmax _before_
   attention (unit 2) since attention weights are a softmax. If you would rather meet
   softmax inside attention, the unit order changes but the edge does not.
2. **`kv-cache` requires `causal-mask`.** I believe this is the best-justified edge in the
   graph: the cache is valid _because_ earlier positions never read later ones. Confirm.
3. **`tokenizer-not-trained` is in unit 3** (needs gradients). Some would teach "the
   tokenizer is fixed" much earlier, as a plain fact, and revisit the reason later. That
   is a choice between a shallow early card and a deep late one.
4. **`teacher-forcing` requires `pretraining-loss`; `mask-in-training` joins teacher forcing
   and the causal mask.** The deck's cards 44 and 73 seem to depend on each other;
   I resolved it with a join node. Check that the resolution is honest.
5. **`pre-vs-post-ln` requires `gradient-backprop`.** Arguably a learner can follow "norm
   placement matters" without the gradient story, and then this is `suggests`, not `requires`.
6. **Edges I made `requires` that may only be `suggests`:** `temperature → softmax`
   (probably fine), `rmsnorm → layernorm` (fine), `vocab-size-tradeoff → unembedding`
   (maybe soft), `context-window-limits → learned-absolute-position` (soft: any position
   scheme illustrates the point).
7. **Unit sizes are 2 to 18 concepts, and the two middle units are too big.** Attention
   (unit 4) has 18 and the block (unit 5) has 17, four of them extensions. Both should split
   (attention: one head / multi-head and masking / position; block: sublayers / the block and
   stack / output and extras), keeping the same graph.

## 7. Corrections to the strategy document

Building this changed two claims I made earlier, both now fixed in the strategy doc:

- I suggested units of 12–25 concepts. Here the small units hold 2–10 and the two big ones
  (17–18) are already too large, so the target should be about 5–10.
- I said both reference decks were "in reading order." Electronics is. **Transformers is
  mostly well ordered**: only 8 forward references, none severe. Its real gaps are the
  missing prerequisites (above), the multi-concept cards, and no item beyond recall.

## 8. What comes next

1. **You review sections 5–6.** Mark the edges you disagree with; I revise. This is the step
   only you can do, and the plan is worthless if it is skipped.
2. Decide the umbrella-versus-OR question for alternatives.
3. Only then: write items per concept (types from the strategy's table), starting with the
   capstone ordering item and a numeric item for `kv-cache-size`, and design the data model
   from what this exercise actually needed: concepts with stable ids, `requires`/`suggests`
   edges with a reason field, external assumptions, and a unit assignment.
