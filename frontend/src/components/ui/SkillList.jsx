import { CheckIcon, XIcon } from '../Icons'

export default function SkillList({ skills = [], type = 'neutral' }) {
  if (!skills || skills.length === 0) return null
  return (
    <div className="skills-list">
      {skills.map((s, i) => (
        <span key={i} className={`skill-chip ${type}`}>
          {type === 'missing' && <XIcon size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />}
          {type === 'matched' && <CheckIcon size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />}
          {s}
        </span>
      ))}
    </div>
  )
}
