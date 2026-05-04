import {Component, EventEmitter, HostBinding, Input, Output, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';
import {LiveFlags} from '../../core/services/interfaces/stream-chat';

@Component({
  selector: 'app-call-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatCheckboxModule],
  templateUrl: './call-controls.component.html',
  styleUrl: './call-controls.component.scss',
})
export class CallControlsComponent {
  @HostBinding('class.in-call') get inCall() {
    return this.isAudioRecording;
  }

  @Input() isAudioRecording = false;
  @Input() isVideoRecording = false;
  @Input() micVolume = 0;
  @Input() isBidiStreamingEnabled: boolean | null = false;

  @Output() readonly toggleAudioRecording = new EventEmitter<LiveFlags>();
  @Output() readonly toggleVideoRecording = new EventEmitter<void>();

  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);

  showFlags = false;
  flags: LiveFlags = {
    proactiveAudio: false,
    enableAffectiveDialog: false,
    enableSessionResumption: false,
    saveLiveBlob: false,
  };

  onCallClick() {
    this.showFlags = false;
    this.toggleAudioRecording.emit(this.flags);
  }
}
