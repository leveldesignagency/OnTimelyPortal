-- Update timeline_modules table schema to support new module types and their data
-- This adds proper fields for multiple_choice, photo_video, and other module types

-- First, let's check the current constraint and update it if needed
ALTER TABLE timeline_modules DROP CONSTRAINT IF EXISTS timeline_modules_module_type_check;

-- Add the new constraint with all allowed module types
ALTER TABLE timeline_modules ADD CONSTRAINT timeline_modules_module_type_check 
CHECK (module_type IN ('qrcode', 'survey', 'feedback', 'question', 'multiple_choice', 'photo_video'));

-- Add new fields for module-specific data
-- Note: We'll use the existing survey_data and feedback_data JSONB fields for flexibility

-- Add a comment to document the expected data structure for each module type
COMMENT ON COLUMN timeline_modules.survey_data IS 'JSONB field for module-specific data. For multiple_choice: {"options": ["option1", "option2"]}. For survey: {"questions": [...]}';
COMMENT ON COLUMN timeline_modules.feedback_data IS 'JSONB field for feedback-specific data. For feedback: {"defaultRating": 5, "scale": 10}';

-- Create a function to validate module data based on type
CREATE OR REPLACE FUNCTION validate_module_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate multiple_choice modules have options
  IF NEW.module_type = 'multiple_choice' THEN
    IF NEW.survey_data IS NULL OR NOT (NEW.survey_data ? 'options') THEN
      RAISE EXCEPTION 'Multiple choice modules must have options in survey_data';
    END IF;
    
    IF jsonb_array_length(NEW.survey_data->'options') < 2 THEN
      RAISE EXCEPTION 'Multiple choice modules must have at least 2 options';
    END IF;
  END IF;
  
  -- Validate photo_video modules have a prompt/title
  IF NEW.module_type = 'photo_video' AND (NEW.title IS NULL OR NEW.title = '') THEN
    RAISE EXCEPTION 'Photo/Video modules must have a title/prompt';
  END IF;
  
  -- Validate qrcode modules have a label
  IF NEW.module_type = 'qrcode' AND (NEW.label IS NULL OR NEW.label = '') THEN
    RAISE EXCEPTION 'QR Code modules must have a label';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_module_data_trigger ON timeline_modules;
CREATE TRIGGER validate_module_data_trigger
  BEFORE INSERT OR UPDATE ON timeline_modules
  FOR EACH ROW
  EXECUTE FUNCTION validate_module_data();

-- Update the add_timeline_module function to handle the new module types
CREATE OR REPLACE FUNCTION add_timeline_module(
    p_event_id UUID,
    p_module_type TEXT,
    p_time TEXT,
    p_title TEXT DEFAULT NULL,
    p_question TEXT DEFAULT NULL,
    p_label TEXT DEFAULT NULL,
    p_link TEXT DEFAULT NULL,
    p_file TEXT DEFAULT NULL,
    p_survey_data JSONB DEFAULT NULL,
    p_feedback_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_module_id UUID;
BEGIN
    INSERT INTO public.timeline_modules (
        event_id, module_type, title, question, "time",
        label, link, file, survey_data, feedback_data,
        created_by
    )
    VALUES (
        p_event_id, p_module_type, p_title, p_question, p_time,
        p_label, p_link, p_file, p_survey_data, p_feedback_data,
        auth.uid()
    )
    RETURNING id INTO new_module_id;
    
    RETURN new_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_event_timeline_modules function to return all fields
CREATE OR REPLACE FUNCTION get_event_timeline_modules(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    module_type TEXT,
    title TEXT,
    question TEXT,
    "time" TEXT,
    label TEXT,
    link TEXT,
    file TEXT,
    survey_data JSONB,
    feedback_data JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id, tm.module_type, tm.title, tm.question, tm."time",
        tm.label, tm.link, tm.file, tm.survey_data, tm.feedback_data,
        tm.created_at
    FROM public.timeline_modules tm
    WHERE tm.event_id = p_event_id
    ORDER BY tm."time", tm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_timeline_module(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_timeline_modules(UUID) TO authenticated;

-- Test the updated schema
SELECT 'timeline_modules schema updated successfully' as result; 