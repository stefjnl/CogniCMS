"use client";

interface PromptSuggestion {
  label: string;
  prompt: string;
  icon: string;
}

const SUGGESTIONS: PromptSuggestion[] = [
  {
    label: "Update hero title",
    prompt: "Change the hero section title to say 'Welcome to Our Platform'",
    icon: "✏️",
  },
  {
    label: "Add team member",
    prompt: "Add a new team member named Alex Johnson as Senior Developer",
    icon: "👤",
  },
  {
    label: "Update contact info",
    prompt: "Change the contact email to support@example.com",
    icon: "📧",
  },
  {
    label: "Modify pricing",
    prompt: "Update the Pro plan price to $49/month",
    icon: "💰",
  },
  {
    label: "Add testimonial",
    prompt: "Add a testimonial from Jane Smith saying 'Great service!'",
    icon: "⭐",
  },
  {
    label: "Update footer",
    prompt: "Change the copyright year to 2025",
    icon: "©️",
  },
];

interface SmartSuggestionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SmartSuggestions({
  onSelect,
  disabled,
}: SmartSuggestionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">Quick suggestions:</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.slice(0, 4).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion.prompt)}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{suggestion.icon}</span>
            <span>{suggestion.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
