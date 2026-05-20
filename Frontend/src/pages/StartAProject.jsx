import ProjectIntakeForm from '../components/forms/ProjectIntakeForm.jsx'

export default function StartAProject() {
  return (
    <section className="start-project-page" aria-label="Start a Project">
      <ProjectIntakeForm
        formId="project-intake-form"
        stageClassName="start-project-form-stage"
      />
    </section>
  )
}
