import { Paperclip, X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { RoundIconButton } from '../../components/RoundIconButton/RoundIconButton';
import { ListScrollIndicator } from '../../components/ListScrollIndicator/ListScrollIndicator';
import { useModalMorph } from '../../components/useModalMorph';
import type { QuestionDraft } from '../../data/questions';
import s from './AskQuestionDialog.module.css';

const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg'];
const acceptedFiles = fileExtensions.map(extension => `.${extension}`).join(',');
const fileFormats = fileExtensions.map(extension => extension.toUpperCase()).join(', ');
const fileKey = (file: File) => JSON.stringify([file.name, file.size, file.lastModified]);

export function AskQuestionDialog({ opener, onClose, onSubmit }: {
  opener: HTMLButtonElement | null;
  onClose: () => void;
  onSubmit: (draft: QuestionDraft) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const attachButton = useRef<HTMLButtonElement>(null);
  const closingRequested = useRef(false);
  const id = useId();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [subjectError, setSubjectError] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [closing, setClosing] = useState(false);
  const [attachments, setAttachments] = useState<readonly File[]>([]);
  const [attachmentError, setAttachmentError] = useState(false);

  useLayoutEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    subjectInput.current?.focus();
  }, []);

  useModalMorph({
    opener, backdrop, reveal, panel, closing,
    onExitComplete: () => dialog.current?.close(),
  });

  function close() {
    if (closingRequested.current) return;
    closingRequested.current = true;
    setClosing(true);
  }

  function attach(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = Array.from(input.files ?? []);
    const supported = selected.filter(file => {
      const separator = file.name.lastIndexOf('.');
      return separator >= 0 && fileExtensions.includes(file.name.slice(separator + 1).toLowerCase());
    });
    setAttachmentError(supported.length !== selected.length);
    setAttachments(previous => [...new Map([...previous, ...supported].map(file => [fileKey(file), file])).values()]);
    input.value = '';
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog.current?.open || closingRequested.current) return;
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    setSubjectError(!cleanSubject);
    setMessageError(!cleanMessage);
    if (!cleanSubject || !cleanMessage) {
      (!cleanSubject ? subjectInput : messageInput).current?.focus();
      return;
    }
    close();
    onSubmit({ subject: cleanSubject, message: cleanMessage, ...(attachments.length > 0 && { attachments }) });
  }

  return <dialog className={s.layer} ref={dialog} aria-labelledby={`${id}-title`}
    aria-describedby={`${id}-hint`} onClose={onClose} onCancel={event => {
      event.preventDefault();
      close();
    }}>
    <ListScrollIndicator scope={dialog} />
    <div className={s.backdrop} ref={backdrop} aria-hidden="true" data-question-backdrop />
    <div className={s.reveal} ref={reveal} data-question-morph>
      <div className={s.dialog} ref={panel} inert={closing} data-question-surface>
        <header className={s.header}>
          <div>
            <h2 id={`${id}-title`}>Задать вопрос</h2>
            <p id={`${id}-hint`}>Укажите тему и опишите вопрос.</p>
          </div>
          <RoundIconButton icon="close" aria-label="Закрыть форму вопроса" onClick={close} />
        </header>
        <form className={s.form} noValidate onSubmit={submit}>
          <div className={s.field}>
            <label htmlFor={`${id}-subject`}>Тема</label>
            <input id={`${id}-subject`} ref={subjectInput} required value={subject} autoComplete="off"
              placeholder="Кратко обозначьте тему" onChange={event => {
                setSubject(event.target.value);
                if (event.target.value.trim()) setSubjectError(false);
              }} aria-invalid={subjectError || undefined}
              aria-describedby={subjectError ? `${id}-subject-error` : undefined} />
            {subjectError && <p id={`${id}-subject-error`} className={s.error} role="alert">Поле «Тема» обязательно для заполнения.</p>}
          </div>
          <div className={s.field}>
            <label htmlFor={`${id}-message`}>Ваш вопрос</label>
            <textarea id={`${id}-message`} ref={messageInput} required value={message} placeholder="Опишите ваш вопрос"
              onChange={event => {
                setMessage(event.target.value);
                if (event.target.value.trim()) setMessageError(false);
              }}
              aria-invalid={messageError || undefined}
              aria-describedby={messageError ? `${id}-message-error` : undefined} />
            {messageError && <p id={`${id}-message-error`} className={s.error} role="alert">Введите текст вопроса, чтобы отправить его.</p>}
          </div>
          <div className={s.attachments}>
            {attachments.length > 0 && <ul className={s.fileList} aria-label="Прикреплённые файлы">
              {attachments.map(file => <li className={s.file} key={fileKey(file)}>
                <Paperclip size={16} aria-hidden="true" />
                <span>{file.name}</span>
                <button className={s.removeFile} type="button" aria-label={`Удалить файл ${file.name}`} onClick={() => {
                  setAttachments(previous => previous.filter(item => item !== file));
                  attachButton.current?.focus();
                }}><X size={16} aria-hidden="true" /></button>
              </li>)}
            </ul>}
            <span className={s.srOnly} role="status">{attachments.length > 0 ? `Прикреплено файлов: ${attachments.length}` : ''}</span>
            {attachmentError && <p className={s.error} role="alert">Файлы неподдерживаемого формата пропущены.</p>}
            <p className={s.fileHint} id={`${id}-file-hint`}>Необязательно. Форматы: {fileFormats}.</p>
          </div>
          <footer className={s.actions}>
            <input ref={fileInput} type="file" accept={acceptedFiles} hidden multiple onChange={attach} />
            <button ref={attachButton} type="button" className={`${s.button} ${s.attach}`}
              aria-describedby={`${id}-file-hint`} onClick={() => fileInput.current?.click()}>
              <Paperclip size={16} aria-hidden="true" />Прикрепить файл
            </button>
            <div className={s.submitActions}>
              <button type="button" className={s.button} onClick={close}>Отмена</button>
              <button type="submit" className={`${s.button} ${s.submit}`}>Отправить вопрос</button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  </dialog>;
}
