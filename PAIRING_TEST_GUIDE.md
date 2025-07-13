# Pairing Generation Test Guide

This guide walks through testing the improved Swiss pairing system with opponent history tracking and color balance.

## Prerequisites

1. Development server should be running on http://localhost:1420
2. You should have access to the Pawn chess tournament application

## Test Scenario: 6-Player Swiss Tournament

### Step 1: Create/Access Test Tournament

1. Open http://localhost:1420 in your browser
2. Navigate to tournaments list
3. Either:
   - Create a new tournament with 4-6 rounds, Swiss system
   - Or use existing "test" tournament (if available)

### Step 2: Add Sample Players

1. Go to tournament details page
2. If no players exist, click "Add Sample Data" button
3. This should add 6 top-level players:
   - Magnus Carlsen (2830, NO)
   - Fabiano Caruana (2820, US)
   - Ding Liren (2810, CN)
   - Ian Nepomniachtchi (2800, RU)
   - Anish Giri (2790, NL)
   - Wesley So (2780, US)

### Step 3: Test Round 1 Pairing Generation

1. Go to "Rounds" tab
2. Click "New Round"
3. Select "Swiss System" pairing method
4. Click "Create Round"
5. On the new round card, click "Generate Pairings"

**Expected Results for Round 1:**
- Should generate 3 pairings (6 players)
- Higher-rated players should be paired first
- No errors should appear
- Console should show pairing generation logs

**Check browser console (F12 > Console) for logs like:**
```
Generating pairings for tournament X, round 1, method: swiss
Generated 3 pairings: [...]
```

### Step 4: Verify Pairing Display

1. PairingsDisplay dialog should open
2. Should show 3 boards with player pairings
3. Each player should appear exactly once
4. Test the "Swap Colors" button on any pairing
5. Click "Confirm Pairings"

**Expected Results:**
- All pairings should be valid (no player duplicates)
- Colors should swap when button is clicked
- Confirmation should create games successfully

### Step 5: Check Standings Update

1. After confirming pairings, verify "Current Standings" section appears
2. All players should show:
   - 0.0 points (games are ongoing)
   - 1 game played
   - 0 wins/draws/losses

### Step 6: Simulate Game Results

1. Go to "Games" tab
2. Find the 3 games for Round 1
3. Update results from "*" (ongoing) to actual results:
   - Set some games to "1-0" (white wins)
   - Set some games to "0-1" (black wins)  
   - Set some games to "1/2-1/2" (draw)

### Step 7: Complete Round 1

1. Return to "Rounds" tab
2. On Round 1 card, click "Complete Round"
3. Verify standings update with new points:
   - Winners should have 1.0 points
   - Draw players should have 0.5 points
   - Losers should have 0.0 points

### Step 8: Test Round 2 with Opponent History

1. Create Round 2 (either "Next Round" button or "New Round")
2. Click "Generate Pairings" for Round 2

**Critical Test - Expected Results for Round 2:**
- ✅ NO player should be paired against their Round 1 opponent
- ✅ Players with similar points should be paired together
- ✅ Color balance should be considered (players who had white in R1 should prefer black in R2)

**Check console logs for:**
```
Starting Swiss pairing with history for 6 players, round 2
Built opponent history for X players
Found X games in history for pairing analysis
Skipping rematch: PlayerA vs PlayerB
Advanced Swiss pairing completed: 3 pairings generated
```

### Step 9: Verify Advanced Features

1. **Color Balance**: Players who were white in Round 1 should preferentially get black in Round 2
2. **Opponent Avoidance**: Check that no Round 1 pairings are repeated
3. **Point-Based Pairing**: Players with similar scores should be paired together

### Step 10: Test Edge Cases

If you want to test further:

1. **Odd Number of Players**: Remove one player and test bye assignment
2. **Multiple Rounds**: Continue through rounds 3-4 to see complex history tracking
3. **Rating Differences**: Add players with very different ratings to test pairing preferences

## Expected Console Output

You should see detailed logging like:

```
Generating pairings for tournament 7, round 2, method: swiss
Found tournament: test with 30 total rounds
Found 6 players for tournament
Found 6 player results
Found 3 games in history for pairing analysis
Starting Swiss pairing with history for 6 players, round 2
Built opponent history for 6 players
Sorted players by points and rating. Top 3 players: [("PlayerA", 1.0), ("PlayerB", 1.0), ("PlayerC", 0.5)]
Skipping rematch: PlayerA vs PlayerC (they played in round 1)
Paired PlayerA (white) vs PlayerD (black) on board 1
Advanced Swiss pairing completed: 3 pairings generated
Generated 3 pairings successfully
```

## Troubleshooting

**If pairing generation fails:**
1. Check browser console for specific error messages
2. Verify all games from previous rounds have been completed
3. Ensure tournament has enough players (minimum 2)

**If no pairings are generated:**
1. Check that the round was created successfully
2. Verify players exist in the tournament
3. Look for any error alerts in the UI

**If rematches occur:**
1. This might indicate an issue with game history retrieval
2. Check that previous round games were properly saved
3. Verify the opponent history is being built correctly in console logs

## Success Criteria

✅ **Round 1**: Clean pairings with no errors  
✅ **Standings**: Update correctly after each round  
✅ **Round 2**: No rematches from Round 1  
✅ **Color Balance**: Players get appropriate color distribution  
✅ **Error Handling**: Clear error messages if something goes wrong  

If all these work, the pairing improvements are functioning correctly!