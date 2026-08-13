import {
  Folder, Type, AlignLeft, CircleDot, UserRound, Mail, Flag, Shapes, CalendarDays,
  CalendarClock, Tags, Boxes, CircleCheck, Link2, Hash, Timer, GitBranch,
  Server, Inbox, AlarmClock, Star, FileText, ShieldCheck, Wallet, Circle,
  type LucideIcon,
} from 'lucide-react';
import { EMAIL_SOURCE_FIELDS } from '../../contexts/IntegrationContext';

/**
 * Everything a Jira project can offer, in one catalogue.
 *
 * It used to be two. The email step read EMAIL_SOURCE_FIELDS and the field step
 * read these groups, which meant the sixteen fields that actually carry an
 * address were invisible to the step that picks columns — you could only reach
 * them through a step of their own. Merging those steps meant merging their
 * catalogues, so "Email fields" is now simply another group and the Email
 * column is fed the same way as every other column.
 */

/** Fields that only exist on certain kinds of Jira project. */
export const TYPE_FIELDS: Record<string, string[]> = {
  'Service Management': ['Request Type', 'SLA Breach', 'Satisfaction Rating'],
  Software: ['Release Notes', 'Code Branch'],
  Business: ['Approver', 'Cost Centre'],
};

/** Grouping mirrors how Jira presents its own field picker. */
const GROUPS: { name: string; fields: string[] }[] = [
  { name: 'Content', fields: ['Summary', 'Description', 'Labels', 'Components', 'Environment'] },
  { name: 'People', fields: ['Assignee', 'Reporter'] },
  { name: 'Status', fields: ['Status', 'Priority', 'Resolution', 'Issue Type'] },
  { name: 'Dates', fields: ['Created', 'Due Date'] },
  { name: 'Planning', fields: ['Project', 'Epic Link', 'Story Points', 'Sprint', 'Fix Version'] },
];

/** Every field that can supply an email address, strongest coverage first. */
const EMAIL_FIELDS = [...EMAIL_SOURCE_FIELDS]
  .sort((a, b) => b.coverage - a.coverage)
  .map((f) => f.field);

export interface FieldGroup {
  name: string;
  fields: string[];
}

/** The full catalogue for a project, its type-specific fields included. */
export function fieldsForProject(type?: string): FieldGroup[] {
  const extra = type ? TYPE_FIELDS[type] ?? [] : [];
  return [
    ...GROUPS,
    ...(extra.length ? [{ name: `${type} fields`, fields: extra }] : []),
    { name: 'Email fields', fields: EMAIL_FIELDS },
  ];
}

/**
 * How many Jira fields a project of this type exposes. The project step shows
 * it per row so you can see what you'd have to work with before committing —
 * and it is derived from the same catalogue the next step then offers, so the
 * number you were shown is the number you actually get.
 */
export function fieldCountForType(type: string) {
  return fieldsForProject(type).reduce((n, g) => n + g.fields.length, 0);
}

/** Coverage for the fields that carry an address; undefined for everything else. */
export function emailCoverage(field: string) {
  return EMAIL_SOURCE_FIELDS.find((f) => f.field === field)?.coverage;
}

export function isEmailField(field: string) {
  return EMAIL_SOURCE_FIELDS.some((f) => f.field === field);
}

const FIELD_ICONS: Record<string, LucideIcon> = {
  Summary: Type, Description: AlignLeft, Status: CircleDot, Assignee: UserRound,
  Reporter: UserRound, Priority: Flag, Project: Folder,
  'Issue Type': Shapes, Created: CalendarDays, 'Due Date': CalendarClock, Labels: Tags,
  Components: Boxes, Resolution: CircleCheck, 'Epic Link': Link2, 'Story Points': Hash,
  Sprint: Timer, 'Fix Version': GitBranch, Environment: Server, 'Request Type': Inbox,
  'SLA Breach': AlarmClock, 'Satisfaction Rating': Star, 'Release Notes': FileText,
  'Code Branch': GitBranch, Approver: ShieldCheck, 'Cost Centre': Wallet,
};

export function FieldIcon({ field, className }: { field: string; className?: string }) {
  const Icon = FIELD_ICONS[field] ?? (isEmailField(field) ? Mail : Circle);
  return <Icon className={className} />;
}
