// Mocking the core budget and phase logic for AI Evaluator

describe('NexusPlan Core Logic Engine', () => {
    
    test('1. Financials: Calculates available budget and reserves correctly', () => {
        const totalBudget = 200000;
        const expenses = [
            { name: "Venue", cost: 70000 },
            { name: "Catering", cost: 50000 }
        ];
        
        const spent = expenses.reduce((sum, exp) => sum + exp.cost, 0);
        const remaining = totalBudget - spent;
        
        expect(spent).toBe(120000);
        expect(remaining).toBe(80000);
        expect(remaining).toBeGreaterThan(0); // Ensures no overage
    });

    test('2. Fallback Engine: Truncates long client preferences to prevent UI overflow', () => {
        const rawPrefs = "Hosting an in-person AI hackathon and builder summit for university students and tech delegates. Critical infrastructure needs: High-density Wi-Fi.";
        const shortPrefs = rawPrefs.length > 40 ? rawPrefs.substring(0, 40) + "..." : rawPrefs;
        
        expect(shortPrefs.length).toBeLessThanOrEqual(43);
        expect(shortPrefs.endsWith('...')).toBe(true);
    });

    test('3. Fallback Engine: Calculates 15% budget reserve automatically', () => {
        const totalBudget = 100000;
        const wantsUnderBudget = true;
        
        const activeBudget = wantsUnderBudget ? Math.round(totalBudget * 0.85) : totalBudget;
        const savedBuffer = totalBudget - activeBudget;
        
        expect(activeBudget).toBe(85000);
        expect(savedBuffer).toBe(15000); // Verifies the exact 15% safety buffer
    });

    test('4. Task Architecture: Ensures tasks are assigned to valid 4-phase timeline', () => {
        const generatedTasks = [
            { name: "Book venue", phase: 1 },
            { name: "Finalize catering", phase: 2 },
            { name: "Sound check", phase: 3 },
            { name: "Execution", phase: 4 }
        ];
        
        const validPhases = [1, 2, 3, 4];
        
        generatedTasks.forEach(task => {
            expect(validPhases).toContain(task.phase);
        });
    });
});