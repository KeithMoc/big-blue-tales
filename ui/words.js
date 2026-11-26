// Button words the page asks for by id (LABELS in sounds/index.js), so no view carries a label of its own.
// Licence: MIT.
import { LABELS } from '../sounds/index.js';
/** label('story.listen') -> 'Listen', or '' when the id is not in LABELS. */
export const label = (id) => LABELS[id] || '';
