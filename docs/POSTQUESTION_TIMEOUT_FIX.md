# Fixed PostQuestionDisplay Timeout Redirect Issue

## Problem
The reconnection timeout was incorrectly triggering during normal game flow when players were viewing explanations or results screens (PostQuestionDisplay). This happened because:

1. During explanation/results display, `question` is set to `null` 
2. The timeout logic incorrectly interpreted this as a "stuck loading" state
3. Players were redirected to the join page in the middle of viewing explanations

## Root Cause
The timeout logic was too broad and didn't account for the normal game states:
- `question = null` during explanations (normal)
- `question = null` during results display (normal) 
- `question = null` during actual loading issues (problem to fix)

## Solution
Updated the timeout logic to be more precise about when to trigger:

### Before (Problematic)
```jsx
// Triggered timeout whenever question was null
if (previewMode || question || sessionRestored) {
  return; // Skip timeout
}

if (isConnected && name && room) {
  // Set timeout - this fired during explanations!
}
```

### After (Fixed)
```jsx
// Only trigger timeout when genuinely stuck in loading
const isStuckInLoading = isConnected && name && room && 
                       !question && !showExplanation && !sessionRestored;

if (isStuckInLoading) {
  // Set timeout - only for real loading issues
  console.log('🕐 Player appears stuck in loading state, setting timeout...');
  
  const timeout = setTimeout(() => {
    // Final check before redirecting
    if (!question && !showExplanation && !sessionRestored) {
      navigate('/join');
    }
  }, 15000);
}
```

## Key Changes

### 1. **Precise State Detection**
- Added `showExplanation` to the condition checks
- Only set timeout when truly stuck (no question AND no explanation AND not restored)
- Added better logging for debugging

### 2. **Updated Loading UI Logic**
```jsx
// Only show reconnection UI when actually reconnecting, not during explanations
{!sessionRestored && isConnected && !showExplanation ? (
  <div className="quiz-loading reconnecting">
    {/* Reconnection UI */}
  </div>
) : (
  <LoadingSkeleton type="question" count={1} />
)}
```

### 3. **Better Dependency Array**
```jsx
// Added showExplanation to dependencies
}, [sessionRestored, isConnected, name, room, question, previewMode, navigate, showExplanation]);
```

## Game Flow States

| State | Question | ShowExplanation | SessionRestored | Action |
|-------|----------|----------------|----------------|---------|
| Loading question | `null` | `false` | `false` | ⏰ Set timeout |
| Showing question | `object` | `false` | `true` | ✅ Normal |
| Showing explanation | `null` | `true` | `true` | ✅ Normal |
| Showing results | `null` | `true` | `true` | ✅ Normal |
| Stuck/Disconnected | `null` | `false` | `false` | ⏰ Set timeout |

## Results

✅ **Fixed timeout during explanations**: Players no longer get redirected while viewing explanations  
✅ **Maintained reconnection functionality**: Genuine stuck states still timeout appropriately  
✅ **Better user experience**: No interruptions during normal game flow  
✅ **Improved logging**: Better debugging information for timeout triggers  

## Testing Scenarios

1. ✅ **Normal Quiz Flow**: Question → Answer → Explanation → Next Question (no timeout)
2. ✅ **Reconnection During Question**: Disconnect → Reconnect → Resume current question
3. ✅ **Reconnection During Explanation**: Disconnect → Reconnect → Resume current explanation  
4. ✅ **Stuck Loading**: Connect but no question received → Timeout after 15s → Redirect
5. ✅ **Network Issues**: Poor connection with delayed responses → Appropriate timeout handling
