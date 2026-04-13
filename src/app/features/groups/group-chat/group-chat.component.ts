import {
  Component,
  Input,
  OnChanges,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { GroupResponseDTO } from 'src/app/core/services/group.service';
import { AuthService } from 'src/app/core/auth/auth.service';

export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderPic?: string;
  content: string;
  sentAt: Date;
}

@Component({
  selector: 'app-group-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './group-chat.component.html',
  styleUrls: ['./group-chat.component.scss'],
})
export class GroupChatComponent implements OnChanges, AfterViewChecked {
  @Input() group!: GroupResponseDTO;
  @ViewChild('messageList') messageList!: ElementRef<HTMLDivElement>;

  private authService = inject(AuthService);
  get me() {
    return this.authService.currentUser!;
  }

  messages = signal<ChatMessage[]>([]);
  inputText = '';
  private shouldScroll = false;

  ngOnChanges() {
    // Load mock history when group changes
    this.messages.set(this.mockMessages());
    this.shouldScroll = true;
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  send() {
    const text = this.inputText.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: Date.now(),
      senderId: this.me.id,
      senderName: this.me.name || this.me.username,
      content: text,
      sentAt: new Date(),
    };

    this.messages.update((list) => [...list, msg]);
    this.inputText = '';
    this.shouldScroll = true;
  }

  onEnter(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  isMine(msg: ChatMessage) {
    return msg.senderId === this.me.id;
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  avatarColor(id: number) {
    return ['#7c3aed', '#ec4899', '#06b6d4', '#3b82f6', '#22c55e', '#f59e0b'][
      id % 6
    ];
  }

  formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  showDateDivider(index: number): boolean {
    if (index === 0) return true;
    const prev = this.messages()[index - 1].sentAt;
    const curr = this.messages()[index].sentAt;
    return prev.toDateString() !== curr.toDateString();
  }

  formatDividerDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private scrollToBottom() {
    try {
      const el = this.messageList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private mockMessages(): ChatMessage[] {
    const now = new Date();
    const d = (mins: number) => new Date(now.getTime() - mins * 60 * 1000);
    return [
      {
        id: 1,
        senderId: 99,
        senderName: 'Alice Roy',
        content: 'Hey everyone! Welcome to the group 👋',
        sentAt: d(120),
      },
      {
        id: 2,
        senderId: 88,
        senderName: 'Ben Kumar',
        content:
          'Thanks for creating this! Really needed a place to discuss Angular.',
        sentAt: d(118),
      },
      {
        id: 3,
        senderId: 99,
        senderName: 'Alice Roy',
        content:
          'Absolutely. Feel free to share resources and ask questions anytime.',
        sentAt: d(115),
      },
      {
        id: 4,
        senderId: 77,
        senderName: 'Priya Singh',
        content:
          'Quick question — anyone tried Angular signals with WebSocket yet?',
        sentAt: d(60),
      },
      {
        id: 5,
        senderId: 88,
        senderName: 'Ben Kumar',
        content:
          'Yes! I wrote a small service for it. Will share the code later.',
        sentAt: d(58),
      },
      {
        id: 6,
        senderId: 77,
        senderName: 'Priya Singh',
        content: 'That would be amazing, thanks Ben!',
        sentAt: d(55),
      },
    ];
  }
}
