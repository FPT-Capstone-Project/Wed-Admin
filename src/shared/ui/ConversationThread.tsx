import { Empty, Image } from 'antd'
import type { ReactNode } from 'react'
import { formatDate } from '../utils/date'
import { UserAvatar } from './UserAvatar'
import './conversation-thread.css'

export interface ConversationEntry {
  id: string
  senderKey: string
  senderName: string
  roleLabel: string
  side: 'left' | 'right'
  createdAt: string | null
  content: ReactNode
  images?: string[]
}

export function ConversationThread({ messages }: { messages: ConversationEntry[] }) {
  return <section className="mcms-conversation" aria-label="Lịch sử trao đổi" tabIndex={0}>
    {!messages.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trao đổi" /> :
      <ol className="mcms-conversation-list">
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const grouped = previous?.senderKey === message.senderKey && previous.side === message.side
          return <li key={message.id} className={`mcms-message mcms-message--${message.side}${grouped ? ' mcms-message--grouped' : ''}`}>
            {message.side === 'left' && <div className="mcms-message-avatar">
              {!grouped && <UserAvatar name={message.senderName} size={30} style={{ borderRadius: '50%', background: '#e2e8f0', color: '#334155' }} />}
            </div>}
            <div className="mcms-message-body">
              {!grouped && <div className="mcms-message-sender"><strong>{message.senderName}</strong><span>{message.roleLabel}</span></div>}
              <div className="mcms-message-bubble">
                {message.content}
                {!!message.images?.length && <Image.PreviewGroup><div className="mcms-message-images">
                  {message.images.map((url, imageIndex) => <Image key={`${url}-${imageIndex}`} src={url} width={180} alt={`Ảnh trao đổi ${imageIndex + 1}`} />)}
                </div></Image.PreviewGroup>}
              </div>
              <time className="mcms-message-time">{formatDate(message.createdAt)}</time>
            </div>
          </li>
        })}
      </ol>}
  </section>
}
