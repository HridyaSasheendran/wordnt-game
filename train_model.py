"""
WORDN'T PLAYER PERSONALITY — model trainer
===========================================

This is a plain, beginner-friendly K-Means script. It is NOT part of the
live game — you run it once (or whenever you want to retrain), and it
writes out a small JavaScript file (model.js) containing everything the
browser needs to classify a player: no Python, no server, no network
calls at game time.

FEATURE VECTOR (order matters everywhere in this project):
    [attempted, survived, avgWordLength, avgResponseTime, mistakes, longestStreak]

STEPS:
  1. Generate a synthetic training set: ~40 fake play-sessions for each
     of the 5 personality archetypes (200 rows total), built from
     reasonable ranges a human playtester would expect, plus noise.
  2. Standardize the features (mean 0, std 1) — this stops
     "avgResponseTime" (values like 2.5) from being ignored just because
     "attempted" has bigger raw numbers (values like 15).
  3. Run K-Means with 5 clusters. K-Means finds 5 group centers
     (centroids) by iteratively assigning points to the nearest center
     and moving each center to the average of its assigned points.
  4. Look at what each centroid's numbers actually mean (fast? slow?
     lots of mistakes? long words?) and match it to the personality
     that best fits — this is done with a similarity score + a greedy
     one-to-one assignment, not hardcoded if/else on the training data.
  5. Export the trained centroids + scaling numbers + label mapping as
     a small JS file the game can use to classify real players.
"""

import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

RNG = np.random.default_rng(42)

FEATURE_NAMES = [
    "attempted", "survived", "avgWordLength",
    "avgResponseTime", "mistakes", "longestStreak",
]

PERSONALITIES = [
    "speed_demon",
    "word_nerd",
    "risk_taker",
    "careful_player",
    "chaos_player",
]

# ---------------------------------------------------------------------
# 1. SYNTHETIC TRAINING DATA
# Each archetype is a set of realistic (min, max) ranges per feature for
# a 30-second WORDN'T round. We sample uniformly inside each range and
# add a little Gaussian noise so clusters aren't perfectly separated
# (real players are messy too).
# ---------------------------------------------------------------------

ARCHETYPE_RANGES = {
    # attempted,  survived,   avgWordLength, avgResponseTime, mistakes, longestStreak
    "speed_demon":     [(12, 20), (10, 18), (3.5, 5.5), (0.8, 2.0), (0, 2), (6, 15)],
    "word_nerd":       [(8, 14),  (7, 13),  (6.0, 9.0), (2.5, 4.5), (0, 2), (5, 12)],
    "risk_taker":      [(10, 16), (4, 8),   (6.0, 9.0), (2.0, 4.0), (4, 8), (2, 5)],
    "careful_player":  [(5, 9),   (4, 8),   (4.0, 6.0), (4.0, 7.0), (0, 1), (3, 8)],
    "chaos_player":    [(8, 16),  (1, 4),   (3.0, 5.0), (1.0, 3.0), (6, 12), (0, 2)],
}

SAMPLES_PER_ARCHETYPE = 40
NOISE_STD_FRACTION = 0.06  # small extra jitter, as a fraction of each range's width

rows = []
row_archetypes = []  # ground-truth label, only used to sanity-check + map clusters

for name in PERSONALITIES:
    ranges = ARCHETYPE_RANGES[name]
    for _ in range(SAMPLES_PER_ARCHETYPE):
        vec = []
        for (lo, hi) in ranges:
            val = RNG.uniform(lo, hi)
            noise = RNG.normal(0, (hi - lo) * NOISE_STD_FRACTION)
            vec.append(val + noise)
        # clip to sane non-negative values, mistakes/attempted/survived/streak are counts
        vec[0] = max(1, round(vec[0]))          # attempted
        vec[1] = max(0, round(vec[1]))           # survived
        vec[1] = min(vec[1], vec[0])              # can't survive more than attempted
        vec[2] = max(1.0, vec[2])                 # avgWordLength
        vec[3] = max(0.3, vec[3])                 # avgResponseTime
        vec[4] = max(0, round(vec[4]))            # mistakes
        vec[5] = max(0, round(vec[5]))            # longestStreak
        rows.append(vec)
        row_archetypes.append(name)

X = np.array(rows, dtype=float)

# ---------------------------------------------------------------------
# 2. STANDARDIZE
# ---------------------------------------------------------------------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ---------------------------------------------------------------------
# 3. K-MEANS
# ---------------------------------------------------------------------
kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
cluster_ids = kmeans.fit_predict(X_scaled)
centroids = kmeans.cluster_centers_  # shape (5, 6), in STANDARDIZED space

# ---------------------------------------------------------------------
# 4. MAP EACH CLUSTER -> A PERSONALITY, BASED ON WHAT THE CENTROID
#    ACTUALLY LOOKS LIKE (not based on the synthetic labels directly —
#    those are only used below to print a sanity check).
#
# For each feature we know which direction "matches" each personality,
# e.g. Speed Demon wants LOW avgResponseTime and HIGH survived.
# Because the centroids are already standardized (mean 0, std 1 across
# the whole training set), a centroid value of +1.2 on "survived"
# genuinely means "this cluster survives more than most clusters" —
# so we can score every (cluster, personality) pair and then run a
# simple greedy matching to assign each cluster its best-fitting,
# still-unclaimed personality.
# ---------------------------------------------------------------------

# feature index shortcuts
IDX = {name: i for i, name in enumerate(FEATURE_NAMES)}

# weights: +1 means "this personality wants this feature HIGH",
#          -1 means "wants it LOW", 0 means "doesn't care much"
PERSONALITY_FEATURE_WEIGHTS = {
    "speed_demon":     {"survived": 1, "avgResponseTime": -1, "mistakes": -0.5},
    "word_nerd":       {"avgWordLength": 1, "survived": 1, "mistakes": -0.5},
    "risk_taker":      {"avgWordLength": 1, "mistakes": 1},
    "careful_player":  {"avgResponseTime": 1, "mistakes": -1},
    "chaos_player":    {"mistakes": 1, "survived": -1},
}

def score_cluster_for_personality(centroid, weights):
    score = 0.0
    for feature, weight in weights.items():
        score += weight * centroid[IDX[feature]]
    return score

# Build a score matrix: rows = clusters, cols = personalities
score_matrix = np.zeros((5, 5))
for c in range(5):
    for p_idx, p_name in enumerate(PERSONALITIES):
        score_matrix[c, p_idx] = score_cluster_for_personality(
            centroids[c], PERSONALITY_FEATURE_WEIGHTS[p_name]
        )

# Greedy one-to-one assignment: repeatedly pick the best remaining
# (cluster, personality) pair, assign it, then remove that row/col.
cluster_to_personality = {}
available_clusters = set(range(5))
available_personalities = set(range(5))

pairs = []
for c in range(5):
    for p in range(5):
        pairs.append((score_matrix[c, p], c, p))
pairs.sort(reverse=True)  # highest score first

for score, c, p in pairs:
    if c in available_clusters and p in available_personalities:
        cluster_to_personality[c] = PERSONALITIES[p]
        available_clusters.remove(c)
        available_personalities.remove(p)

CENTROID_LABELS = [cluster_to_personality[c] for c in range(5)]

# ---------------------------------------------------------------------
# Sanity check: how well does the greedy cluster->personality mapping
# line up with the synthetic ground-truth labels we generated?
# (Printed for your own confidence — not used by the game.)
# ---------------------------------------------------------------------
correct = 0
for i, cluster_id in enumerate(cluster_ids):
    predicted_personality = cluster_to_personality[cluster_id]
    if predicted_personality == row_archetypes[i]:
        correct += 1
accuracy = correct / len(rows)
print(f"Sanity check — training-set label agreement: {accuracy:.1%}")
print("Cluster -> Personality mapping:")
for c in range(5):
    print(f"  cluster {c}: {cluster_to_personality[c]}  (centroid: "
          + ", ".join(f"{FEATURE_NAMES[i]}={centroids[c][i]:+.2f}" for i in range(6))
          + ")")

# ---------------------------------------------------------------------
# 5. EXPORT TO JS
# ---------------------------------------------------------------------
model_js = f"""/* =====================================================
   WORDN'T PLAYER PERSONALITY — trained K-Means model
   Auto-generated by train_model.py — do not hand-edit.

   Feature order: {FEATURE_NAMES}
===================================================== */

const WORDNT_AI_MODEL = {{

  featureNames: {json.dumps(FEATURE_NAMES)},

  // mean/std used to standardize a raw feature vector the same way
  // the training data was standardized before K-Means was trained
  featureMeans: {json.dumps(scaler.mean_.tolist())},
  featureStds: {json.dumps(scaler.scale_.tolist())},

  // the 5 cluster centers K-Means found, in STANDARDIZED space
  centroids: {json.dumps(centroids.tolist())},

  // cluster index -> personality key (decided by analyzing each
  // centroid's feature values, see train_model.py)
  centroidLabels: {json.dumps(CENTROID_LABELS)}

}};
"""

with open("model.js", "w") as f:
    f.write(model_js)

print("\nWrote model.js")
