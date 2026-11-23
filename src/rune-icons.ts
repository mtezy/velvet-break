type RuneIcon = 'award' | 'award-empty' | 'forward' | 'portal' | 'restart' | 'unlimited' | 'verified' | 'selected';

export function runeIcon(name:RuneIcon){
  return `<svg class="rune-icon" aria-hidden="true" focusable="false"><use href="#rune-${name}"/></svg>`;
}

export function runeStars(earned:number){
  return runeIcon('award').repeat(earned)+runeIcon('award-empty').repeat(3-earned);
}
